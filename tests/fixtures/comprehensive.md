# Markdown 综合语法测试

## 一、标题与基本文本

这是一个用于测试 **Markdown 渲染效果** 的示例文档。这里包含 **粗体**、*斜体*、***粗斜体***、删除线，以及 `行内代码`。

你也可以使用 [Markdown 官方网站](https://daringfireball.net/projects/markdown/) 这样的**超链接**。

> Markdown 的核心思想是：让文本保持简单，同时拥有良好的结构。
>
> —— 一段引用文字

---

## 二、列表

### 无序列表

- • 苹果
- • 香蕉
- • 橙子 国产橙子 进口橙子
- • 西瓜

### 有序列表

1. 1\. 第一步：确定目标
2. 2\. 第二步：制定计划
3. 3\. 第三步：开始执行
4. 4\. 第四步：复盘和调整

### 任务列表

- • [x] 完成需求分析
- • [x] 编写测试内容
- • [ ] 检查 Markdown 渲染
- • [ ] 发布最终版本

---

## 三、代码

行内代码可以这样写：`console.log("Hello Markdown");`

下面是一个真正的**代码块**：
```javascript
function greet(name) {
    const message = `Hello, ${name}!`;
    console.log(message);
}

greet("Markdown");

```

Python 示例：
```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

for i in range(10):
    print(fibonacci(i))

```

Shell 示例：
```bash
# 创建项目目录
mkdir markdown-demo
cd markdown-demo

echo "Hello Markdown"

```

---

## 四、表格

| **项目** **类型** **状态** **备注**  |      |        |      |
| ---------------------------- | ---- | ------ | ---- |
| Markdown                     | 标记语言 | ✅ 完成   | 基础语法 |
| HTML                         | 标记语言 | 🟡 进行中 | 扩展测试 |
| CSS                          | 样式语言 | ⬜ 未开始  | 后续测试 |
| JavaScript                   | 编程语言 | ⬜ 未开始  | 交互测试 |

---

## 五、其他常见写法

### 图片

[IMAGE:img_[https://mmbiz.qpic.cn/mmbiz_png/ibYGicnRpq0rVK2OjhbKDibO4j3RYj9C4JkNGnuEf7YlDdLTfVvS0sXmO2CuEfk9KNHV80dYyRyic2uc9Kr7E7sHHdiavMSK4MHQdzTosvcDsFXg/0?wx_fmt=png&from=appmsg_Markdown](https://mmbiz.qpic.cn/mmbiz_png/ibYGicnRpq0rVK2OjhbKDibO4j3RYj9C4JkNGnuEf7YlDdLTfVvS0sXmO2CuEfk9KNHV80dYyRyic2uc9Kr7E7sHHdiavMSK4MHQdzTosvcDsFXg/0?wx_fmt=png\&from=appmsg_Markdown) Logo_1196]

### 链接

[https://example.com](https://example.com)

### 转义字符

如果你希望显示 Markdown 特殊字符，可以使用反斜杠：

*这不会被解析成斜体*

# 这也不会成为标题

### 数学表达式

如果渲染器支持 LaTeX，可以测试：

E=mc2E = mc^2

以及行内公式：a2+b2=c2a^2 + b^2 = c^2。

---

## 六、嵌套结构

> ### 一个嵌套标题
>
> 这是引用中的段落。
>
> - • 引用中的列表
> - • 粗体文字
> - • 代码

---

## 七、结尾

Markdown 看起来很简单，但不同渲染器之间仍然可能存在差异。

例如：

1. 1\. CommonMark
2. 2\. GitHub Flavored Markdown
3. 3\. Markdown Extra
4. 4\. 各种自定义 Markdown 方言

因此，如果你正在开发 Markdown 编辑器或渲染器，最好针对**标题、列表、表格、引用、代码块、链接、图片、转义字符以及嵌套结构**分别进行测试。

> **好的测试文本，不只是“能渲染”，还应该能够暴露渲染器的边界情况。**

---

**测试结束。**
