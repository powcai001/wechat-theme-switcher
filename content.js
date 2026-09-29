(() => {
  const isArticleEditor = location.hostname === 'mp.weixin.qq.com'
    && location.pathname === '/cgi-bin/appmsg'
    && new URLSearchParams(location.search).get('action') === 'edit';
  if (!isArticleEditor || window.__wechatThemeSpikeLoaded) return;
  window.__wechatThemeSpikeLoaded = true;

  const originalStyles = new WeakMap();
  const themeEntries = Object.entries(STYLES);
  const storageKeys = {
    recent: 'wechatThemeSpikeRecentThemes',
    favorites: 'wechatThemeSpikeFavoriteThemes',
    markdownSource: 'wechatThemeSpikeMarkdownSource',
    markdownAutoSync: 'wechatThemeSpikeMarkdownAutoSync'
  };
  let currentTheme = null;
  let recentThemes = [];
  let favoriteThemes = [];
  let activeFilter = '全部';
  let editor = null;
  let ui = null;
  let originalMarkup = null;
  let originalRootStyle = null;
  let lastRenderedMarkup = null;
  let internalWrite = false;
  let userEditedSinceRender = false;
  let markdownSource = null;
  let markdownAutoSync = true;
  let markdownSyncTimer = null;
  const watchedEditors = new WeakSet();

  function findEditor() {
    const articleBody = document.querySelector('.view.rich_media_content .ProseMirror[contenteditable="true"]');
    if (articleBody && !articleBody.closest('[data-wechat-theme-spike-host]')) return articleBody;
    const candidates = [...document.querySelectorAll('[contenteditable="true"], [contenteditable=""]')]
      .filter(el => !el.closest('[data-wechat-theme-spike-host]'))
      .filter(el => el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA');
    if (document.body.isContentEditable) candidates.unshift(document.body);
    return candidates.find(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 250 && rect.height > 80;
    }) || null;
  }

  function restoreNodes(root) {
    if (!root) return;
    for (const node of [root, ...root.querySelectorAll('*')]) {
      if (!originalStyles.has(node)) continue;
      const style = originalStyles.get(node);
      if (style === null) node.removeAttribute('style');
      else node.setAttribute('style', style);
      originalStyles.delete(node);
    }
  }

  function forgetStyleSnapshots(root) {
    if (!root) return;
    for (const node of [root, ...root.querySelectorAll('*')]) {
      originalStyles.delete(node);
    }
  }

  // Huasheng's preview is rendered from clean semantic HTML. WeChat drafts
  // often contain pasted inline formatting on span/p elements, which wins over
  // inherited theme values and makes the same theme look different. Remove
  // only presentation properties before applying a theme; the full original
  // style attribute is kept in originalStyles so Restore can put it back.
  const themePresentationProperties = new Set([
    'font', 'font-family', 'font-size', 'line-height', 'color', 'background',
    'background-color', 'background-image', 'letter-spacing', 'text-align', 'text-indent',
    'font-weight', 'font-style', 'text-decoration', 'vertical-align',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'border-radius', 'box-shadow', 'display', 'width', 'max-width', 'min-width',
    'height', 'max-height', 'min-height', 'position', 'top', 'right', 'bottom',
    'left', 'overflow', 'overflow-x', 'overflow-y', 'list-style', 'list-style-type',
    'text-shadow', 'text-transform', 'white-space', 'word-break', 'word-wrap',
    'overflow-wrap', 'background-clip', 'background-origin', 'background-size',
    'background-repeat', 'background-position', 'border-image', 'border-image-source',
    'border-image-slice', 'border-image-width', 'border-image-outset', 'border-image-repeat',
    'outline', 'outline-color', 'outline-style', 'outline-width', 'opacity', 'filter',
    'transform', 'transform-origin', 'clip-path', 'box-sizing', 'float', 'clear',
    'table-layout', 'border-collapse', 'border-spacing', 'caption-side', 'empty-cells',
    '-webkit-background-clip', '-webkit-text-fill-color', '-webkit-text-stroke',
    '-webkit-text-stroke-width', '-webkit-text-stroke-color'
  ]);

  // Include every declaration used by the bundled themes. This catches
  // longhand and vendor-prefixed properties (for example border-image and
  // -webkit-background-clip) that are easy to miss in a fixed allowlist.
  for (const theme of Object.values(STYLES)) {
    for (const css of Object.values(theme.styles || {})) {
      if (typeof css !== 'string') continue;
      const parsed = document.createElement('span');
      parsed.style.cssText = css;
      for (let index = 0; index < parsed.style.length; index += 1) {
        themePresentationProperties.add(parsed.style.item(index));
      }
    }
  }

  function normalizeInlineFormatting(root, remember = true) {
    root.querySelectorAll('[data-wechat-theme-decoration]').forEach(node => node.remove());
    for (const node of [root, ...root.querySelectorAll('[style]')]) {
      if (node.closest('[data-wechat-theme-spike-host]')) continue;
      if (!node.style) continue;
      let changed = false;
      for (const property of themePresentationProperties) {
        if (node.style.getPropertyValue(property)) {
          if (remember && !originalStyles.has(node)) originalStyles.set(node, node.getAttribute('style'));
          node.style.removeProperty(property);
          changed = true;
        }
      }
      if (changed && !node.getAttribute('style')?.trim()) node.removeAttribute('style');
    }
  }

  function applyThemeCss(node, css) {
    // WeChat's editor stylesheet marks several typography rules as
    // !important. Setting the theme declarations as inline !important keeps
    // those editor defaults from winning over the selected theme.
    const parsed = document.createElement('span');
    parsed.style.cssText = css;
    for (let index = 0; index < parsed.style.length; index += 1) {
      const property = parsed.style.item(index);
      const value = parsed.style.getPropertyValue(property);
      if (!property || !value) continue;
      node.style.setProperty(property, value, 'important');
    }
  }

  function addThemeDecorations(root, themeKey) {
    if (themeKey !== 'wechat-tech') return;
    for (const pre of root.querySelectorAll('pre')) {
      const chrome = document.createElement('span');
      chrome.setAttribute('data-wechat-theme-decoration', 'terminal-chrome');
      chrome.setAttribute('contenteditable', 'false');
      chrome.style.cssText = 'display: block; height: 14px; margin: -20px -20px 18px; padding: 0 12px; background: #2b2d35; line-height: 14px; white-space: nowrap;';
      for (const color of ['#ff5f57', '#febc2e', '#28c840']) {
        const dot = document.createElement('span');
        dot.setAttribute('data-wechat-theme-decoration', 'terminal-dot');
        dot.style.cssText = `display: inline-block; width: 8px; height: 8px; margin-right: 6px; border-radius: 50%; background: ${color}; vertical-align: middle;`;
        chrome.appendChild(dot);
      }
      pre.insertBefore(chrome, pre.firstChild);
      if (!pre.style.getPropertyValue('color')) {
        pre.style.setProperty('color', '#c5c8d0', 'important');
      }
    }
  }

  // Huasheng treats adjacent image paragraphs as one image grid before it
  // applies the selected theme. We do the same so a Markdown article with
  // several consecutive images does not become a long vertical image list in
  // the WeChat editor.
  function flattenImageGrids(root) {
    if (!root) return;
    root.querySelectorAll('[data-wechat-theme-image-grid], .image-grid').forEach(grid => {
      const fragment = document.createDocumentFragment();
      grid.querySelectorAll('img').forEach(image => {
        const paragraph = document.createElement('p');
        const restored = image.cloneNode(true);
        restored.removeAttribute('style');
        paragraph.appendChild(restored);
        fragment.appendChild(paragraph);
      });
      grid.replaceWith(fragment);
    });
  }

  function groupConsecutiveImages(root) {
    if (!root) return;
    const children = [...root.children];
    const imageItems = [];

    children.forEach((element, index) => {
      if (element.tagName === 'P') {
        const images = [...element.querySelectorAll(':scope > img')];
        if (images.length) {
          images.forEach(image => imageItems.push({ element, image, index }));
        }
      } else if (element.tagName === 'IMG') {
        imageItems.push({ element, image: element, index });
      }
    });

    const groups = [];
    let current = [];
    imageItems.forEach((item, index) => {
      const previous = imageItems[index - 1];
      const adjacent = !previous || item.index === previous.index || item.index - previous.index === 1;
      if (!adjacent && current.length) {
        groups.push(current);
        current = [];
      }
      current.push(item);
    });
    if (current.length) groups.push(current);

    groups.filter(group => group.length >= 2).forEach(group => {
      const count = group.length;
      const columns = count === 2 || count === 4 ? 2 : 3;
      const grid = document.createElement('div');
      grid.className = 'wechat-theme-image-grid';
      grid.setAttribute('data-wechat-theme-image-grid', 'true');
      grid.setAttribute('data-image-count', String(count));
      grid.setAttribute('data-columns', String(columns));
      grid.style.cssText = [
        'display: grid',
        `grid-template-columns: repeat(${columns}, 1fr)`,
        'gap: 8px',
        'margin: 20px auto',
        'max-width: 100%',
        'align-items: start'
      ].join('; ');

      group.forEach(({ image }) => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'width: 100%; height: auto; overflow: hidden;';
        const clone = image.cloneNode(true);
        clone.style.cssText = 'width: 100%; height: auto; display: block; border-radius: 8px;';
        wrapper.appendChild(clone);
        grid.appendChild(wrapper);
      });

      group[0].element.parentNode.insertBefore(grid, group[0].element);
      [...new Set(group.map(item => item.element))].forEach(element => element.remove());
    });
  }

  function normalizeHeadingInlineElements(root) {
    const overrides = {
      strong: 'font-weight: 700; color: inherit !important; background-color: transparent !important;',
      em: 'font-style: italic; color: inherit !important; background-color: transparent !important;',
      a: 'color: inherit !important; text-decoration: none !important; border-bottom: 1px solid currentColor !important; background-color: transparent !important;',
      code: 'color: inherit !important; background-color: transparent !important; border: none !important; padding: 0 !important;',
      span: 'color: inherit !important; background-color: transparent !important;',
      b: 'font-weight: 700; color: inherit !important; background-color: transparent !important;',
      i: 'font-style: italic; color: inherit !important; background-color: transparent !important;',
      del: 'color: inherit !important; background-color: transparent !important;',
      mark: 'color: inherit !important; background-color: transparent !important;',
      s: 'color: inherit !important; background-color: transparent !important;',
      u: 'color: inherit !important; text-decoration: underline !important; background-color: transparent !important;',
      ins: 'color: inherit !important; text-decoration: underline !important; background-color: transparent !important;'
    };
    root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      Object.entries(overrides).forEach(([tag, css]) => {
        heading.querySelectorAll(tag).forEach(node => {
          const style = node.getAttribute('style') || '';
          const cleaned = style
            .replace(/color:\s*[^;]+;?/gi, '')
            .replace(/background(?:-color)?:\s*[^;]+;?/gi, '')
            .replace(/border(?:-bottom)?:\s*[^;]+;?/gi, '')
            .replace(/text-decoration:\s*[^;]+;?/gi, '')
            .replace(/box-shadow:\s*[^;]+;?/gi, '')
            .replace(/padding:\s*[^;]+;?/gi, '')
            .replace(/;\s*;/g, ';')
            .trim();
          node.setAttribute('style', `${cleaned}; ${css}`);
        });
      });
    });
  }

  let markdownRenderer = null;
  let turndownService = null;

  function getTurndownService() {
    if (typeof TurndownService === 'undefined') return null;
    if (turndownService) return turndownService;
    turndownService = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined'
    });

    // Keep the same table conversion semantics as Huasheng's smart paste.
    turndownService.addRule('table', {
      filter: 'table',
      replacement: (_content, node) => {
        const rows = [...node.querySelectorAll('tr')];
        if (!rows.length) return '';
        let markdown = '\n\n';
        let headerProcessed = false;
        rows.forEach((row, index) => {
          const cells = [...row.querySelectorAll('td, th')];
          const contents = cells.map(cell => cell.textContent.replace(/\n/g, ' ').trim());
          if (!contents.length) return;
          markdown += `| ${contents.join(' | ')} |\n`;
          if (index === 0 || (!headerProcessed && row.querySelector('th'))) {
            markdown += `| ${cells.map(() => '---').join(' | ')} |\n`;
            headerProcessed = true;
          }
        });
        return `${markdown}\n`;
      }
    });

    turndownService.addRule('theme-code-block', {
      filter: node => node.nodeType === Node.ELEMENT_NODE
        && node.matches('[data-wechat-theme-code-block]'),
      replacement: (_content, node) => {
        const code = node.querySelector('code');
        const language = node.getAttribute('data-lang') || '';
        const text = (code?.textContent || node.textContent || '').replace(/\n$/, '');
        const fenceLength = Math.max(3, ...text.split('\n').map(line => (line.match(/`+/g) || []).reduce((sum, item) => sum + item.length, 0)), 0) + 1;
        const fence = '`'.repeat(fenceLength);
        return `\n\n${fence}${language}\n${text}\n${fence}\n\n`;
      }
    });
    return turndownService;
  }

  // Contenteditable can normalize literal newlines when a fragment is
  // inserted through execCommand. Explicit <br> nodes keep code lines stable
  // while white-space:pre preserves indentation and spaces.
  function readCodeText(node) {
    if (!node) return '';
    let text = '';
    for (const child of node.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE && child.tagName === 'BR') text += '\n';
      else text += child.textContent || '';
    }
    return text.replace(/\r\n?/g, '\n').replace(/\n$/, '');
  }

  function writeCodeLines(code, sourceText) {
    const text = String(sourceText || '')
      .replace(/\r\n?/g, '\n')
      .replace(/\n$/, '');
    const lines = text.split('\n');
    code.textContent = '';
    lines.forEach((line, index) => {
      code.appendChild(document.createTextNode(line));
      if (index < lines.length - 1) code.appendChild(document.createElement('br'));
    });
  }

  function editorHtmlToMarkdown(root) {
    const service = getTurndownService();
    if (!service) return null;
    const source = root.cloneNode(true);

    // Turndown collapses whitespace in a styled DIV even when its child code
    // uses white-space:pre. Convert plugin terminal blocks back to standard
    // pre/code before conversion so newlines and indentation survive another
    // Markdown round trip.
    source.querySelectorAll('[data-wechat-theme-code-block]').forEach(block => {
      const previous = block.querySelector('code');
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      const language = block.getAttribute('data-lang') || '';
      if (language) code.className = `language-${language}`;
      code.textContent = previous ? readCodeText(previous) : block.textContent || '';
      pre.appendChild(code);
      block.replaceWith(pre);
    });

    // Normalize both literal newlines and explicit BR code lines before
    // Turndown sees them, so an editor draft can still round-trip safely.
    source.querySelectorAll('pre > code').forEach(code => {
      code.textContent = readCodeText(code);
    });

    flattenImageGrids(source);
    return service.turndown(source.innerHTML).trim();
  }

  function getMarkdownRenderer() {
    if (typeof window.markdownit === 'undefined') return null;
    if (markdownRenderer) return markdownRenderer;
    markdownRenderer = window.markdownit({
      html: true,
      linkify: true,
      typographer: false
    });
    return markdownRenderer;
  }

  function makeTerminalCodeBlock(pre) {
    const code = pre.querySelector(':scope > code');
    const languageMatch = code?.className.match(/language-([\w+-]+)/);
    const language = languageMatch?.[1] || '';
    const text = code ? readCodeText(code) : (pre.textContent || '');

    const block = document.createElement('div');
    block.setAttribute('data-wechat-theme-code-block', 'true');
    block.setAttribute('data-lang', language);
    block.style.cssText = 'margin: 20px 0; border-radius: 8px; overflow: hidden; background: #383a42; box-shadow: 0 2px 8px rgba(0,0,0,0.15);';

    const chrome = document.createElement('div');
    chrome.style.cssText = 'display: flex; align-items: center; gap: 6px; padding: 10px 12px; background: #2a2c33; border-bottom: 1px solid #1e1f24;';
    for (const color of ['#ff5f56', '#febc2e', '#28c840']) {
      const dot = document.createElement('span');
      dot.style.cssText = `width: 12px; height: 12px; border-radius: 50%; background: ${color}; flex: none;`;
      chrome.appendChild(dot);
    }

    const scrollArea = document.createElement('div');
    scrollArea.style.cssText = 'padding: 16px; overflow-x: auto; background: #383a42;';
    const renderedCode = document.createElement('code');
    renderedCode.style.cssText = "display: block; color: #abb2bf; font-family: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace; font-size: 14px; line-height: 1.6; white-space: pre;";
    writeCodeLines(renderedCode, text);

    scrollArea.appendChild(renderedCode);
    block.append(chrome, scrollArea);
    return block;
  }

  function normalizeListMarkers(root) {
    root.querySelectorAll('ul > li').forEach(item => {
      const first = item.firstChild;
      if (first?.nodeType === Node.TEXT_NODE) first.textContent = first.textContent.replace(/^•\s*/, '');
    });

    root.querySelectorAll('ol > li').forEach((item, index) => {
      const first = item.firstChild;
      if (first?.nodeType !== Node.TEXT_NODE) return;
      const prefix = new RegExp(`^${index + 1}\\.\\s*`);
      first.textContent = first.textContent.replace(prefix, '');
    });
  }

  function normalizeTaskLists(root) {
    root.querySelectorAll('li').forEach(item => {
      const first = item.firstChild;
      if (first?.nodeType !== Node.TEXT_NODE) return;
      const match = first.textContent.match(/^\[([xX ])\]\s*/);
      if (!match) return;
      const checked = match[1].toLowerCase() === 'x';
      first.textContent = first.textContent.slice(match[0].length);

      const checkbox = document.createElement('span');
      checkbox.setAttribute('data-wechat-task-checkbox', checked ? 'checked' : 'unchecked');
      checkbox.setAttribute('aria-hidden', 'true');
      checkbox.style.cssText = [
        'display: inline-block',
        'width: 15px',
        'height: 15px',
        'margin-right: 7px',
        'border: 1px solid #7d8a83',
        'border-radius: 3px',
        'vertical-align: -2px',
        `background: ${checked ? '#23a16d' : '#fff'}`,
        'color: #fff',
        'font-size: 11px',
        'line-height: 14px',
        'text-align: center'
      ].join('; ');
      checkbox.textContent = checked ? '✓' : '';
      item.insertBefore(checkbox, item.firstChild);
    });
  }

  function normalizeMarkdownTables(root) {
    root.querySelectorAll('table').forEach(table => {
      const headers = [...table.querySelectorAll('thead th')];
      if (headers.length < 2 || headers.slice(1).some(cell => cell.textContent.trim())) return;
      const labels = [...headers[0].querySelectorAll('strong')].map(cell => cell.textContent.trim());
      if (labels.length !== headers.length) return;
      headers.forEach((cell, index) => {
        if (!labels[index]) cell.replaceChildren(document.createTextNode(''));
        else {
          const label = document.createElement('strong');
          label.textContent = labels[index];
          cell.replaceChildren(label);
        }
      });
    });
  }

  function renderMarkdownToCleanHtml(markdown, themedCodeBlocks) {
    const renderer = getMarkdownRenderer();
    if (!renderer) return null;
    const container = document.createElement('div');
    // Always render CommonMark's standard fenced-code output first. Replacing
    // it after parsing avoids markdown-it nesting a custom highlight fragment
    // inside another <pre><code>, which produced double code-block chrome and
    // inconsistent margins/fonts in the WeChat editor.
    container.innerHTML = renderer.render(markdown || '');
    container.querySelectorAll('pre > code').forEach(code => writeCodeLines(code, code.textContent));
    if (themedCodeBlocks) {
      container.querySelectorAll('pre').forEach(pre => {
        pre.replaceWith(makeTerminalCodeBlock(pre));
      });
    }
    return container;
  }

  function clearAllFormatting(root) {
    if (!root) return false;
    const markdown = markdownSource !== null ? markdownSource : editorHtmlToMarkdown(root);
    const rendered = markdown === null ? null : renderMarkdownToCleanHtml(markdown, false);
    if (!rendered) return false;
    rendered.querySelectorAll('[class]').forEach(node => node.removeAttribute('class'));

    // Markdown rendering is the formatting boundary. It removes historical
    // classes, data attributes, empty wrappers, inline styles and pasted
    // presentational markup while retaining the article's semantic structure.
    if (!replaceEditorHtml(root, rendered.innerHTML.trim())) return false;
    forgetStyleSnapshots(root);
    root.removeAttribute('style');
    originalMarkup = null;
    originalRootStyle = null;
    lastRenderedMarkup = null;
    userEditedSinceRender = false;
    currentTheme = null;
    editor = root;
    return true;
  }

  function watchEditor(root) {
    if (!root || watchedEditors.has(root)) return;
    watchedEditors.add(root);
    root.addEventListener('input', () => {
      if (!internalWrite) userEditedSinceRender = true;
    });
  }

  function unwrapThemeContainers(root) {
    root.querySelectorAll('[data-wechat-theme-container], [data-wechat-theme-content]').forEach(node => {
      const parent = node.parentNode;
      if (!parent) return;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      parent.removeChild(node);
    });
  }

  function replaceEditorHtml(root, html) {
    if (!root || typeof html !== 'string') return false;
    watchEditor(root);
    internalWrite = true;
    root.focus();
    const before = root.innerHTML;
    // WeChat's ProseMirror layer can anchor an inserted fragment inside the
    // previous theme wrapper. Unwrap stale containers first so repeated theme
    // switches can never nest <section>/<div> wrappers and shrink the article
    // by one padding layer on every toggle.
    unwrapThemeContainers(root);
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(root);
    selection.removeAllRanges();
    selection.addRange(range);
    let inserted = false;
    try {
      inserted = document.execCommand('insertHTML', false, html);
    } catch (_) {
      inserted = false;
    }
    selection.removeAllRanges();

    // Chromium may parse a multi-node fragment in the context of the first
    // selected heading and produce invalid wrappers such as <h1><p>...</p>.
    // Top-level tags alone cannot detect a wrapper nested inside a previous
    // wrapper (SECTION|SECTION still matches), so also compare the theme
    // container fingerprint and fall back to a full HTML replacement.
    // Input events keep ProseMirror/other editor layers informed of the write.
    const expected = document.createElement('div');
    expected.innerHTML = html;
    const signature = node => [...node.children].map(child => child.tagName).join('|');
    const themeFingerprint = node => JSON.stringify({
      containers: node.querySelectorAll('[data-wechat-theme-container]').length,
      contents: node.querySelectorAll('[data-wechat-theme-content]').length,
      misplacedContents: [...node.querySelectorAll('[data-wechat-theme-content]')]
        .filter(element => !element.hasAttribute('data-wechat-theme-container')
          && !element.parentElement?.matches('[data-wechat-theme-container]')).length
    });
    const structurallyValid = signature(root) === signature(expected)
      && themeFingerprint(root) === themeFingerprint(expected);
    if (!inserted || !structurallyValid) {
      root.innerHTML = html;
      try {
        root.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          inputType: 'insertHTML',
          data: html
        }));
      } catch (_) {
        root.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    internalWrite = false;

    // execCommand can report success even when the editor immediately
    // normalizes the fragment. A changed editor is the useful signal here;
    // an empty fragment is also a valid result when restoring an empty draft.
    return root.innerHTML !== before || html === '';
  }

  function convertImageGridsToTables(root) {
    root.querySelectorAll('[data-wechat-theme-image-grid], .image-grid').forEach(grid => {
      const columns = Number(grid.dataset.columns) || 2;
      const wrappers = [...grid.children];
      const table = document.createElement('table');
      table.style.cssText = 'width: 100% !important; border-collapse: collapse !important; margin: 20px auto !important; table-layout: fixed !important; border: none !important; background: transparent !important;';
      for (let row = 0; row < Math.ceil(wrappers.length / columns); row += 1) {
        const tr = document.createElement('tr');
        for (let column = 0; column < columns; column += 1) {
          const td = document.createElement('td');
          td.style.cssText = `padding: 4px !important; vertical-align: top !important; width: ${100 / columns}% !important; border: none !important; background: transparent !important;`;
          const wrapper = wrappers[row * columns + column];
          const image = wrapper?.querySelector('img');
          if (image) {
            const outer = document.createElement('div');
            outer.style.cssText = 'width: 100% !important; height: 360px !important; text-align: center !important; background-color: #f5f5f5 !important; border-radius: 4px !important; padding: 10px !important; box-sizing: border-box !important; overflow: hidden !important; display: table !important;';
            const inner = document.createElement('div');
            inner.style.cssText = 'display: table-cell !important; vertical-align: middle !important; text-align: center !important;';
            const clone = image.cloneNode(true);
            clone.style.cssText = 'max-width: calc(100% - 20px) !important; max-height: 340px !important; width: auto !important; height: auto !important; display: inline-block !important; margin: 0 auto !important; border-radius: 4px !important; object-fit: contain !important;';
            inner.appendChild(clone);
            outer.appendChild(inner);
            td.appendChild(outer);
          }
          tr.appendChild(td);
        }
        table.appendChild(tr);
      }
      grid.replaceWith(table);
    });
  }

  function simplifyTerminalCodeBlocks(root) {
    root.querySelectorAll('[data-wechat-theme-code-block]').forEach(block => {
      const source = block.querySelector('code');
      const pre = document.createElement('pre');
      pre.style.cssText = 'background: linear-gradient(to bottom, #2a2c33 0%, #383a42 8px, #383a42 100%); padding: 0; border-radius: 6px; overflow: hidden; margin: 24px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.15);';
      const code = document.createElement('code');
      code.style.cssText = 'color: #abb2bf; font-family: "SF Mono", Consolas, Monaco, "Courier New", monospace; font-size: 14px; line-height: 1.7; display: block; white-space: pre; padding: 16px 20px; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;';
      writeCodeLines(code, source ? readCodeText(source) : block.textContent || '');
      pre.appendChild(code);
      block.replaceWith(pre);
    });
  }

  function flattenListItems(root) {
    root.querySelectorAll('li').forEach(item => {
      const checkbox = item.querySelector(':scope > [data-wechat-task-checkbox]');
      const textNodes = [...item.childNodes]
        .filter(node => node !== checkbox)
        .map(node => node.textContent || '');
      const text = textNodes.join('').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      item.textContent = text;
      if (checkbox) item.insertBefore(checkbox.cloneNode(true), item.firstChild);
    });
  }

  function adaptBlockquotesForWeChat(root) {
    root.querySelectorAll('blockquote').forEach(blockquote => {
      let style = blockquote.getAttribute('style') || '';
      style = style
        .replace(/background(?:-color)?:\s*[^;]+;?/gi, '')
        .replace(/color:\s*[^;]+;?/gi, '')
        .replace(/;\s*;/g, ';')
        .replace(/^\s*;|;\s*$/g, '')
        .trim();
      style += '; background: rgba(0, 0, 0, 0.05) !important; color: rgba(0, 0, 0, 0.8) !important';
      blockquote.setAttribute('style', style);
    });
  }

  function wrapThemeContainer(root, selected) {
    const container = selected?.styles?.container || '';
    // Mirror Huasheng's clipboard output: article content must travel inside
    // the theme container element. The previous implementation dropped this
    // wrapper for white-background themes and moved its padding onto the
    // WeChat editing surface, which rendered with different side whitespace
    // than the same theme copied from editor.huasheng.ai.
    const wrapper = document.createElement('div');
    wrapper.setAttribute('style', container);
    wrapper.setAttribute('data-wechat-theme-content', 'true');
    while (root.firstChild) wrapper.appendChild(root.firstChild);

    const match = container.match(/background-color:\s*(#[0-9a-f]+)\s*(!important)?/i);
    const background = match?.[1];
    if (!background || background.toLowerCase() === '#fff' || background.toLowerCase() === '#ffffff') {
      wrapper.setAttribute('data-wechat-theme-container', 'true');
      return wrapper;
    }

    const section = document.createElement('section');
    const padding = container.match(/padding:\s*([^;]+)/)?.[1]?.trim() || '40px 20px';
    const maxWidth = container.match(/max-width:\s*([^;]+)/)?.[1]?.trim() || '100%';
    section.style.cssText = `background-color: ${background}; padding: ${padding}; max-width: ${maxWidth}; margin: 0 auto; box-sizing: border-box; word-wrap: break-word;`;
    section.setAttribute('data-wechat-theme-container', 'true');
    section.appendChild(wrapper);

    // Match Huasheng: inner elements must not repeat the outer width,
    // centering, or container background rules.
    for (const node of section.querySelectorAll('*')) {
      const style = node.getAttribute('style');
      if (!style) continue;
      const next = style
        .replace(/max-width:\s*[^;]+;?/g, '')
        .replace(/margin:\s*0\s+auto;?/g, '')
        .replace(new RegExp(`background-color:\\s*${background}(\\s*!important)?;?`, 'gi'), '')
        .replace(/;\s*;/g, ';')
        .replace(/^\s*;|\s*;$/g, '')
        .trim();
      if (next === style) continue;
      if (next) node.setAttribute('style', next);
      else node.removeAttribute('style');
    }
    return section;
  }

  function renderMarkdownArticle(markdown, selected) {
    let rendered = renderMarkdownToCleanHtml(markdown, Boolean(selected));
    if (!rendered) return null;

    normalizeListMarkers(rendered);
    normalizeTaskLists(rendered);
    normalizeMarkdownTables(rendered);
    groupConsecutiveImages(rendered);
    const themeStyles = selected?.styles || {};
    for (const [tag, css] of Object.entries(themeStyles)) {
        if (tag === 'container' || !css) continue;
        for (const node of rendered.querySelectorAll(tag)) {
          if (node.closest('[data-wechat-theme-spike-host]')) continue;
          if (tag === 'code' && (node.closest('pre') || node.closest('[data-wechat-theme-code-block]'))) continue;
          if (tag === 'img' && node.closest('[data-wechat-theme-image-grid], .image-grid')) continue;
          if (tag === 'pre' && node.querySelector('[data-wechat-theme-code-block]')) continue;
          applyThemeCss(node, css);
        }
      }
      normalizeHeadingInlineElements(rendered);
      const firstBlock = rendered.firstElementChild;
    if (firstBlock) firstBlock.style.setProperty('margin-top', '0', 'important');

    if (selected) {
      convertImageGridsToTables(rendered);
      simplifyTerminalCodeBlocks(rendered);
      adaptBlockquotesForWeChat(rendered);
      normalizeListMarkers(rendered);
      normalizeTaskLists(rendered);
      normalizeMarkdownTables(rendered);
      rendered = wrapThemeContainer(rendered, selected);
    }
    return rendered;
  }

  function findTitleEditor(bodyEditor) {
    const explicitSelectors = [
      'textarea[placeholder*="标题"]',
      'input[placeholder*="标题"]',
      '[contenteditable="true"][data-placeholder*="标题"]',
      '[contenteditable=""][data-placeholder*="标题"]',
      '[aria-label*="标题"]',
      'textarea#title',
      'input#title',
      '[name="title"]',
      '[data-testid="article-title"]',
      '.article-title'
    ];
    for (const selector of explicitSelectors) {
      const found = [...document.querySelectorAll(selector)]
        .filter(el => el !== bodyEditor)
        .filter(el => !el.closest('[data-wechat-theme-spike-host]'))
        .find(el => el.offsetWidth > 80 && el.offsetHeight > 0);
      if (found) return found;
    }

    const candidates = [...document.querySelectorAll('input, textarea, [contenteditable="true"], [contenteditable=""]')]
      .filter(el => el !== bodyEditor)
      .filter(el => !el.closest('[data-wechat-theme-spike-host]'))
      .filter(el => el.offsetParent !== null)
      .filter(el => el.offsetWidth > 100 && el.offsetHeight > 0 && el.offsetHeight < 140);
    let best = null;
    let bestScore = 0;
    for (const element of candidates) {
      const text = [
        element.getAttribute('placeholder'),
        element.getAttribute('data-placeholder'),
        element.getAttribute('aria-label'),
        element.getAttribute('name'),
        element.id,
        element.className
      ].filter(Boolean).join(' ').toLowerCase();
      const label = element.closest('label')?.textContent || '';
      const score = (text.includes('标题') || text.includes('title') ? 80 : 0)
        + (label.includes('标题') ? 50 : 0)
        + (['INPUT', 'TEXTAREA'].includes(element.tagName) ? 15 : 0);
      if (score > bestScore) {
        best = element;
        bestScore = score;
      }
    }
    return bestScore >= 50 ? best : null;
  }

  function dispatchEditorChange(element) {
    try {
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        composed: true,
        inputType: 'insertText',
        data: element.value ?? element.textContent ?? ''
      }));
    } catch (_) {
      element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  function writeTitleToEditor(element, title) {
    if (!element || !title) return false;
    element.focus();
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = title;
    } else {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
      let inserted = false;
      try {
        inserted = document.execCommand('insertText', false, title);
      } catch (_) {
        inserted = false;
      }
      if (!inserted) element.textContent = title;
      selection.removeAllRanges();
    }
    dispatchEditorChange(element);
    return true;
  }

  function extractArticleTitle(rendered) {
    const heading = rendered.querySelector('h1');
    if (!heading) return null;
    const title = heading.textContent.replace(/\s+/g, ' ').trim();
    heading.remove();
    return title || null;
  }

  function writeMarkdownToEditor(markdown, themeKey) {
    const root = findEditor();
    if (!root) return { ok: false, message: '没有检测到正文编辑区，请刷新编辑页后重试。' };
    const selected = themeKey ? STYLES[themeKey] : null;
    if (themeKey && !selected) return { ok: false, message: '这个主题暂时无法使用，请换一个试试。' };
    watchEditor(root);

    if (originalMarkup === null) {
      originalMarkup = root.innerHTML;
      originalRootStyle = root.getAttribute('style');
    }

    const rendered = renderMarkdownArticle(markdown, selected);
    if (!rendered) {
      return { ok: false, message: 'Markdown 渲染失败，请检查语法后重试。' };
    }
    const articleTitle = extractArticleTitle(rendered);
    let titleUpdated = true;
    if (articleTitle) {
      const titleEditor = findTitleEditor(root);
      titleUpdated = writeTitleToEditor(titleEditor, articleTitle);
      const contentRoot = rendered.matches('[data-wechat-theme-content]')
        ? rendered
        : rendered.querySelector('[data-wechat-theme-content]');
      if (contentRoot?.firstElementChild) contentRoot.firstElementChild.style.setProperty('margin-top', '0', 'important');
    }
    const editorHtml = rendered.matches('[data-wechat-theme-container]')
      ? rendered.outerHTML.trim()
      : rendered.innerHTML.trim();
    const bodyUpdated = replaceEditorHtml(root, editorHtml);
    if (!bodyUpdated && !articleTitle) {
      return { ok: false, message: '微信编辑器拒绝了这次写入，请重试或刷新编辑页。' };
    }

    if (selected?.styles?.container && !rendered.matches('[data-wechat-theme-container]')) {
      if (!originalStyles.has(root)) originalStyles.set(root, originalRootStyle);
      applyThemeCss(root, selected.styles.container);
    } else {
      root.removeAttribute('style');
    }
    lastRenderedMarkup = root.innerHTML;
    userEditedSinceRender = false;
    editor = root;
    currentTheme = themeKey;
    const titleSuffix = articleTitle
      ? (titleUpdated ? '；公众号标题已更新' : '；未识别到公众号标题输入框')
      : '';
    const imageWarning = /\[IMAGE:/i.test(markdown)
      ? '；检测到 [IMAGE:] 占位符，请改为 ![图片说明](图片地址)'
      : '';
    return {
      ok: true,
      message: (selected ? `已从 Markdown 应用「${selected.name}」` : '已将 Markdown 同步为微信原生样式')
        + titleSuffix + imageWarning,
      titleWarning: articleTitle && !titleUpdated
    };
  }

  function syncMarkdownSource({ automatic = false } = {}) {
    if (markdownSource === null) return;
    if (automatic && !markdownSource.trim()) {
      setStatus('Markdown 源文为空；点击「同步到正文」才会清空正文。');
      return;
    }
    const result = writeMarkdownToEditor(markdownSource, currentTheme);
    setStatus(result.message, !result.ok);
  }

  function applyTheme(themeKey) {
    const root = findEditor();
    if (!root) return { ok: false, message: '没有检测到正文编辑区，请刷新编辑页后重试。' };
    if (!STYLES[themeKey]) return { ok: false, message: '这个主题暂时无法使用，请换一个试试。' };

    const markdown = markdownSource !== null ? markdownSource : editorHtmlToMarkdown(root);
    if (markdown === null) return { ok: false, message: 'Markdown 转换组件未加载，请重新加载扩展后重试。' };
    markdownSource = markdown;
    if (ui?.markdownInput) ui.markdownInput.value = markdown;
    savePreference(storageKeys.markdownSource, markdown);
    return writeMarkdownToEditor(markdown, themeKey);
  }

  function setStatus(message, isError = false) {
    ui.status.textContent = message;
    ui.status.dataset.error = String(isError);
  }

  function setCurrentTheme(themeKey) {
    const theme = STYLES[themeKey];
    const name = theme ? theme.name : '主题';
    ui.launcherLabel.textContent = currentTheme ? `主题 · ${name}` : '主题';
    ui.current.textContent = currentTheme ? `当前主题：${name}` : '尚未应用主题';
    ui.cards.forEach(card => {
      const selected = card.dataset.themeKey === currentTheme;
      card.classList.toggle('selected', selected);
      card.querySelector('.theme-select').setAttribute('aria-pressed', String(selected));
    });
  }

  function applyFilter() {
    const query = ui.search.value.trim().toLocaleLowerCase();
    for (const card of ui.cards) {
      const key = card.dataset.themeKey;
      const name = STYLES[key].name.toLocaleLowerCase();
      const matchesQuery = !query || name.includes(query);
      const matchesFilter = activeFilter === '全部'
        || (activeFilter === '最近使用' && recentThemes.includes(key))
        || (activeFilter === '收藏' && favoriteThemes.includes(key));
      card.hidden = !(matchesQuery && matchesFilter);
    }
    const visible = ui.cards.some(card => !card.hidden);
    ui.empty.hidden = visible;
    ui.empty.textContent = activeFilter === '收藏' && favoriteThemes.length === 0
      ? '还没有收藏主题，点卡片上的星标即可收藏。'
      : '没有找到匹配的主题。';
  }

  function savePreference(key, value) {
    try { chrome.storage.local.set({ [key]: value }); } catch (_) { /* Keep the panel usable if storage is unavailable. */ }
  }

  function toggleFavorite(key) {
    favoriteThemes = favoriteThemes.includes(key)
      ? favoriteThemes.filter(item => item !== key)
      : [key, ...favoriteThemes];
    savePreference(storageKeys.favorites, favoriteThemes);
    for (const card of ui.cards) {
      const favorite = favoriteThemes.includes(card.dataset.themeKey);
      const button = card.querySelector('[data-favorite]');
      button.textContent = favorite ? '★' : '☆';
      button.setAttribute('aria-label', favorite ? '取消收藏' : '收藏主题');
      button.setAttribute('aria-pressed', String(favorite));
    }
    applyFilter();
  }

  function recordRecent(key) {
    recentThemes = [key, ...recentThemes.filter(item => item !== key)].slice(0, 8);
    savePreference(storageKeys.recent, recentThemes);
  }

  function makeThemeCard(key, theme) {
    const card = document.createElement('div');
    card.className = 'theme-card';
    card.setAttribute('role', 'group');
    card.dataset.themeKey = key;
    const select = document.createElement('button');
    select.className = 'theme-select';
    select.type = 'button';
    select.setAttribute('aria-pressed', 'false');
    const sample = document.createElement('div');
    sample.className = 'theme-sample';
    sample.setAttribute('aria-hidden', 'true');
    const render = document.createElement('div');
    render.className = 'theme-render';
    render.style.cssText = theme.styles?.container || '';
    const heading = document.createElement('h1');
    heading.textContent = '文章标题示例';
    const paragraph = document.createElement('p');
    paragraph.textContent = '这里展示正文的字号、颜色和行距。';
    const quote = document.createElement('blockquote');
    quote.textContent = '重点引用效果';
    const list = document.createElement('ul');
    const listItem = document.createElement('li');
    listItem.textContent = '列表项目';
    list.appendChild(listItem);
    for (const [el, selector] of [[heading, 'h1'], [paragraph, 'p'], [quote, 'blockquote'], [listItem, 'li']]) {
      const style = theme.styles?.[selector];
      if (style) el.style.cssText = style;
      render.appendChild(el);
    }
    render.style.width = '260px';
    render.style.minHeight = '136px';
    render.appendChild(list);
    sample.appendChild(render);
    const name = document.createElement('span');
    name.className = 'theme-name';
    name.textContent = theme.name;
    const favorite = document.createElement('button');
    favorite.className = 'favorite';
    favorite.type = 'button';
    favorite.dataset.favorite = 'true';
    const isFavorite = favoriteThemes.includes(key);
    favorite.textContent = isFavorite ? '★' : '☆';
    favorite.setAttribute('aria-label', isFavorite ? '取消收藏' : '收藏主题');
    favorite.setAttribute('aria-pressed', String(isFavorite));
    const nameRow = document.createElement('span');
    nameRow.className = 'theme-name-row';
    nameRow.append(name);
    select.append(sample, nameRow);
    card.append(select, favorite);
    select.addEventListener('click', () => {
      const result = applyTheme(key);
      setStatus(result.message, !result.ok);
      if (!result.ok) return;
      recordRecent(key);
      setCurrentTheme(key);
      applyFilter();
    });
    favorite.addEventListener('click', () => toggleFavorite(key));
    return card;
  }

  function importMarkdownFile(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStatus('Markdown 文件超过 2MB，暂不支持导入。', true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      markdownSource = text;
      ui.markdownInput.value = text;
      savePreference(storageKeys.markdownSource, text);
      setStatus(`已导入「${file.name}」。自动同步开启时会立即写入正文。`);
      if (markdownAutoSync) syncMarkdownSource({ automatic: true });
    };
    reader.onerror = () => setStatus(`读取「${file.name}」失败。`, true);
    reader.readAsText(file, 'utf-8');
  }

  function mountPanel() {
    if (document.querySelector('[data-wechat-theme-spike-host]')) return;
    const host = document.createElement('div');
    host.dataset.wechatThemeSpikeHost = 'true';
    host.setAttribute('contenteditable', 'false');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host{all:initial;position:fixed;inset:0 auto auto 0;z-index:2147483647;color:#24312b;font:13px/1.48 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        *{box-sizing:border-box}button,input,textarea{font:inherit}button{cursor:pointer}
        .launcher{position:fixed;right:0;top:50%;transform:translateY(-50%);width:47px;min-height:138px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:15px 7px;border:1px solid #d4e3da;border-right:0;border-radius:15px 0 0 15px;background:linear-gradient(180deg,#ffffff,#f5faf7);color:#1f684a;box-shadow:-5px 5px 20px #172e221d;font-weight:750;transition:width .15s ease,color .15s ease,background .15s ease}
        .launcher:hover,.launcher[aria-expanded="true"]{color:#0f5b3b;background:linear-gradient(180deg,#effaf4,#ffffff)}
        .launcher[aria-expanded="true"]{width:53px}
        .dot{width:8px;height:8px;flex:none;border-radius:50%;background:#23a36a;box-shadow:0 0 0 4px #d9f2e5}
        [data-launcher-label]{writing-mode:vertical-rl;letter-spacing:.18em;font-size:13px;line-height:1}
        .panel{position:fixed;right:60px;top:50%;transform:translateY(-50%);width:min(580px,calc(100vw - 78px));max-height:min(88vh,940px);display:flex;flex-direction:column;overflow:hidden;border:1px solid #dfe8e2;border-radius:18px;background:#fff;box-shadow:0 20px 52px #1f352926}
        .panel[hidden],.launcher[hidden],.empty[hidden]{display:none}
        .head{padding:17px 19px 13px;border-bottom:1px solid #e7eeea;background:linear-gradient(180deg,#f8fbf9,#fff)}
        .headrow{display:flex;align-items:center;gap:10px}.title{font-size:17px;font-weight:780;letter-spacing:-.01em}.close{margin-left:auto;width:31px;height:31px;border:0;border-radius:9px;background:transparent;color:#68756e;font-size:21px;line-height:1}.close:hover{background:#edf3ef;color:#334139}
        .current{margin-top:5px;color:#68756e;font-size:12px}
        .markdown-source{flex:none;padding:15px 18px 13px;border-bottom:1px solid #e7eeea;background:#f8faf9}
        .markdown-head{display:flex;align-items:center;gap:8px}.markdown-title{font-size:12px;font-weight:760;color:#37463f}.auto-sync{margin-left:auto;display:flex;align-items:center;gap:5px;color:#68756e;font-size:11px;cursor:pointer}
        .markdown-input{display:block;margin-top:9px;width:100%;height:184px;resize:vertical;min-height:96px;max-height:380px;padding:11px;border:1px solid #d9e3dc;border-radius:10px;background:#fff;color:#24312b;font-family:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;font-size:12.5px;line-height:1.62;outline-color:#62ac89}
        .markdown-actions{display:flex;gap:7px;margin-top:9px}.md-button{flex:none;border:1px solid #cfe0d6;border-radius:8px;background:#fff;padding:7px 10px;color:#256746;font-size:11.5px;font-weight:680}.md-button:hover{background:#f3faf6}.md-button.primary{background:#237a52;border-color:#237a52;color:#fff}.md-button.primary:hover{background:#1d6a46}
        .md-hint{margin-top:7px;color:#87928b;font-size:10.5px}
        .search{margin:13px 18px 9px;width:calc(100% - 36px);padding:9px 12px;border:1px solid #dde7e1;border-radius:9px;outline-color:#62ac89;color:#24312b;background:white}
        .tabs{display:flex;gap:6px;padding:0 18px 12px}.tab{border:0;border-radius:18px;padding:6px 11px;color:#68756e;background:#eef2ef;font-size:12px}.tab:hover{color:#334139}.tab.active{color:#126e47;background:#ddf3e8;font-weight:700}
        .cards{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:10px;align-content:start;padding:0 18px 15px;overflow:auto;overscroll-behavior:contain}
        .theme-card{position:relative;min-width:0;text-align:left;border:1px solid #e3ebe6;border-radius:12px;padding:9px;background:#fff;color:#26312a;transition:border-color .12s ease,box-shadow .12s ease,transform .12s ease}
        .theme-card:hover{border-color:#93c7aa;box-shadow:0 4px 14px #20352812;transform:translateY(-1px)}
        .theme-card.selected{border:2px solid #23835d;padding:8px;box-shadow:0 0 0 3px #dff4ea}
        .theme-select{width:100%;padding:0;border:0;background:transparent;text-align:left;color:inherit}
        .theme-sample{height:96px;overflow:hidden;padding:0;border-radius:8px;background:#fafafa}.theme-render{overflow:hidden;transform:scale(.57);transform-origin:top left;color:#334139;font-size:16px;line-height:1.5}.theme-render h1,.theme-render p,.theme-render blockquote,.theme-render ul{max-width:100%;overflow:hidden}.theme-render img{max-width:100%;height:auto}
        .theme-name-row{display:flex;align-items:center;gap:6px;padding-top:8px}.theme-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:700;padding-right:24px}
        .favorite{position:absolute;right:10px;bottom:9px;width:24px;height:25px;padding:0;border:0;border-radius:6px;background:transparent;color:#c08c28;font-size:17px;line-height:1}.favorite:hover{background:#f7f0df}
        .empty{grid-column:1/-1;padding:30px 10px;text-align:center;color:#849087;font-size:12px}
        .status{flex:none;min-height:41px;padding:10px 18px;border-top:1px solid #e7eeea;background:#f8faf9;color:#68756e;font-size:11.5px}.status[data-error="true"]{color:#a33}
        @media(max-width:700px){.launcher{min-height:116px}.panel{right:54px;width:calc(100vw - 66px);max-height:92vh}.markdown-input{height:145px}.cards{grid-template-columns:1fr}}
      </style>
      <button class="launcher" type="button" aria-expanded="false"><span class="dot"></span><span data-launcher-label>主题</span></button>
      <section class="panel" role="dialog" aria-label="文章主题" hidden>
        <header class="head"><div class="headrow"><span class="title">文章主题</span><button class="close" type="button" aria-label="关闭主题面板">×</button></div><div class="current" data-current>尚未应用主题</div></header>
        <section class="markdown-source" aria-label="Markdown 源文">
          <div class="markdown-head"><span class="markdown-title">Markdown 源文</span><label class="auto-sync"><input class="auto-sync-input" type="checkbox" checked>自动同步</label></div>
          <textarea class="markdown-input" placeholder="在这里粘贴 Markdown；也可以点「从正文导入」。输入后会自动同步到公众号正文，再点主题卡片即可换格式。" spellcheck="false"></textarea>
          <div class="markdown-actions"><button class="md-button" type="button" data-import-file>导入 .md</button><button class="md-button" type="button" data-import-editor>从正文导入</button><button class="md-button primary" type="button" data-sync-editor>同步到正文</button></div>
          <input class="file-input" type="file" accept=".md,.markdown,text/markdown,text/plain" hidden>
          <div class="md-hint">Markdown 是源内容；切换主题会从这份源文重建，避免编辑器 HTML 反复污染。</div>
        </section>
        <input class="search" type="search" placeholder="搜索主题" aria-label="搜索主题">
        <nav class="tabs" aria-label="筛选主题"><button class="tab active" type="button">全部</button><button class="tab" type="button">最近使用</button><button class="tab" type="button">收藏</button></nav>
        <div class="cards" role="list"></div><div class="empty" hidden></div>
        <div class="status" role="status" aria-live="polite">点选主题即可即时预览；满意后请用微信后台保存草稿。</div>
      </section>`;
    (document.body || document.documentElement).appendChild(host);
    const $ = selector => shadow.querySelector(selector);
    const cardsContainer = $('.cards');
    const cards = themeEntries.map(([key, theme]) => makeThemeCard(key, theme));
    cards.forEach(card => cardsContainer.appendChild(card));
    ui = {
      host, shadow, panel: $('.panel'), launcher: $('.launcher'),
      launcherLabel: $('[data-launcher-label]'), current: $('[data-current]'),
      status: $('.status'), cards, empty: $('.empty'), search: $('.search'),
      markdownInput: $('.markdown-input'), autoSyncInput: $('.auto-sync-input'),
      importEditorButton: $('[data-import-editor]'), syncEditorButton: $('[data-sync-editor]'),
      importFileButton: $('[data-import-file]'), fileInput: $('.file-input'),
      tabs: [...shadow.querySelectorAll('.tab')]
    };
    ui.launcher.addEventListener('click', () => {
      ui.panel.hidden = !ui.panel.hidden;
      ui.launcher.setAttribute('aria-expanded', String(!ui.panel.hidden));
      if (!ui.panel.hidden) ui.markdownInput.focus();
    });
    $('.close').addEventListener('click', () => {
      ui.panel.hidden = true;
      ui.launcher.setAttribute('aria-expanded', 'false');
      ui.launcher.focus();
    });
    ui.tabs.forEach(tab => tab.addEventListener('click', () => {
      ui.tabs.forEach(item => item.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.textContent;
      applyFilter();
    }));
    ui.autoSyncInput.addEventListener('change', () => {
      markdownAutoSync = ui.autoSyncInput.checked;
      savePreference(storageKeys.markdownAutoSync, markdownAutoSync);
      setStatus(markdownAutoSync ? '已开启自动同步：停止输入约 0.6 秒后写入正文。' : '已关闭自动同步；修改后需点击「同步到正文」。');
    });
    ui.markdownInput.addEventListener('input', () => {
      markdownSource = ui.markdownInput.value;
      savePreference(storageKeys.markdownSource, markdownSource);
      if (markdownSyncTimer) clearTimeout(markdownSyncTimer);
      if (!markdownAutoSync) {
        setStatus('Markdown 已修改；点击「同步到正文」写入公众号。');
        return;
      }
      setStatus('等待 Markdown 输入结束，稍后自动同步…');
      markdownSyncTimer = setTimeout(() => syncMarkdownSource({ automatic: true }), 600);
    });
    ui.importFileButton.addEventListener('click', () => ui.fileInput.click());
    ui.fileInput.addEventListener('change', () => {
      importMarkdownFile(ui.fileInput.files?.[0]);
      ui.fileInput.value = '';
    });
    ui.markdownInput.addEventListener('dragover', event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    });
    ui.markdownInput.addEventListener('drop', event => {
      event.preventDefault();
      importMarkdownFile(event.dataTransfer?.files?.[0]);
    });
    ui.importEditorButton.addEventListener('click', () => {
      const root = editor || findEditor();
      if (!root) {
        setStatus('没有检测到正文编辑区。', true);
        return;
      }
      const imported = editorHtmlToMarkdown(root);
      if (imported === null) {
        setStatus('从正文导入 Markdown 失败。', true);
        return;
      }
      markdownSource = imported;
      ui.markdownInput.value = imported;
      savePreference(storageKeys.markdownSource, imported);
      setStatus('已从正文导入 Markdown。后续切换主题将优先使用这份源文。');
    });
    ui.syncEditorButton.addEventListener('click', () => {
      markdownSource = ui.markdownInput.value;
      savePreference(storageKeys.markdownSource, markdownSource);
      syncMarkdownSource();
    });
    shadow.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !ui.panel.hidden) {
        ui.panel.hidden = true;
        ui.launcher.setAttribute('aria-expanded', 'false');
        ui.launcher.focus();
      }
    });
    setCurrentTheme(null);
    applyFilter();
  }

  function loadPreferences() {
    try {
      chrome.storage.local.get([storageKeys.recent, storageKeys.favorites, storageKeys.markdownSource, storageKeys.markdownAutoSync], result => {
        if (chrome.runtime.lastError) return;
        recentThemes = Array.isArray(result[storageKeys.recent]) ? result[storageKeys.recent] : [];
        favoriteThemes = Array.isArray(result[storageKeys.favorites]) ? result[storageKeys.favorites] : [];
        if (!ui) return;
        if (typeof result[storageKeys.markdownSource] === 'string') {
          markdownSource = result[storageKeys.markdownSource];
          ui.markdownInput.value = markdownSource;
        }
        markdownAutoSync = result[storageKeys.markdownAutoSync] !== false;
        ui.autoSyncInput.checked = markdownAutoSync;
        for (const card of ui.cards) {
          const favorite = favoriteThemes.includes(card.dataset.themeKey);
          const button = card.querySelector('[data-favorite]');
          button.textContent = favorite ? '★' : '☆';
          button.setAttribute('aria-label', favorite ? '取消收藏' : '收藏主题');
          button.setAttribute('aria-pressed', String(favorite));
        }
        applyFilter();
      });
    } catch (_) { /* Local theme switching works without saved preferences. */ }
  }

  function waitForEditor(attempt = 0) {
    editor = findEditor();
    if (editor) {
      mountPanel();
      loadPreferences();
      return;
    }
    if (attempt >= 20) return;
    setTimeout(() => waitForEditor(attempt + 1), 400);
  }

  if (document.documentElement) waitForEditor();
  else document.addEventListener('DOMContentLoaded', () => waitForEditor(), { once: true });
})();
