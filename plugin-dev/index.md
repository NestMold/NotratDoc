---
title: 插件开发
---

# 插件开发

Notrat 的插件不改动应用本体，只是往界面里加面板、往对话里加工具、往文件树里加菜单。这三样都用声明的方式交给宿主，插件本身由三部分组成：

- **声明**（`manifest.json` 或单文件 `<id>.json`）：面板放哪、命令叫什么、哪些扩展名的文件归你管、要不要注入提示词，都在这里写。
- **执行**（MCP 服务器子进程）：插件的逻辑跑在这里，用 stdio 上的 JSON-RPC 暴露工具。这是插件的沙箱，也是重活的落点。
- **界面**（TSX 组件）：面板与编辑器的界面代码经过编译与门禁后由宿主渲染，拿不到 Node 能力，只能用白名单里的几个模块。

三者组合起来就是一个可分发的插件包，可以只放在自己机器上，也可以发布到插件市场。

## 插件能扩什么

| 能扩的东西 | 声明字段 | 详细说明 |
| --- | --- | --- |
| 面板（侧边栏、停靠栏、悬浮窗、整页……） | `contributions.ui[]`、`contributions.sidebar[]` | [面板与界面扩展](/plugin-dev/panels) |
| 编辑器（按扩展名接管文件） | `contributions.editors[]` | [编辑器与组件扩展](/plugin-dev/editor) |
| 活动栏按钮 | `ui[].location: "activity-bar"` | [面板与界面扩展](/plugin-dev/panels) |
| 斜杠命令 | `contributions.commands[]` | [面板与界面扩展](/plugin-dev/panels) |
| 工具（给对话和面板调用） | MCP 服务器的 `tools/list` | [插件里的 MCP 服务器](/plugin-dev/mcp-servers) |
| MCP 服务器 | `mcpServers[]` | [插件里的 MCP 服务器](/plugin-dev/mcp-servers) |
| 工具钩子（调用前拦截 / 调用后观察） | `contributions.toolHooks[]` | [插件里的 MCP 服务器](/plugin-dev/mcp-servers) |
| 设置项（每插件独立设置对话框） | `contributions.settings[]` | [面板与界面扩展](/plugin-dev/panels) |
| 系统提示词片段 | `contributions.promptSections[]` | [面板与界面扩展](/plugin-dev/panels) |
| 消息渲染器 | `contributions.renderers[]` | [面板与界面扩展](/plugin-dev/panels) |
| 文件树右键菜单 | `contributions.fileTreeMenus[]` | [面板与界面扩展](/plugin-dev/panels) |
| 组件覆盖 / 槽位覆盖（v1 兼容） | `diy.overrides`、`diy.slotOverrides` | [编辑器与组件扩展](/plugin-dev/editor) |

除界面以外，插件还能复用宿主已有的能力：用户配置好的 AI 服务商、已经注册的 MCP 连接器（含 Notrat 内置的那些）、技能库，以及一个不暴露账号信息的插件作用域身份。这几条通路见 [面板与界面扩展](/plugin-dev/panels) 与 [插件里的 MCP 服务器](/plugin-dev/mcp-servers) 中的说明。

## 能做什么，不能做什么

**能做的：**

- 加面板到 14 个可声明位置之一（含整页标签页、独立桌面窗口），用户可以右键把面板「移动到…」别的位置。
- 给 AI 对话加工具：插件 MCP 服务器的工具默认活在插件私有命名空间，被自己的面板与命令调用；登记到用户级配置后主对话也能自然语言调用。
- 给文件树加右键菜单、给某些扩展名接管编辑器、给消息加渲染器。
- 声明式设置表单，改完自动把值注入服务器环境变量（`${settings:<字段key>}`）并重启服务器。
- 借用宿主的 AI 网关发起对话，不用再跟用户要一次 API Key。
- 横向调用任何已注册的 MCP 连接器：内置的、用户自配的、其他插件的。

**不能做的：**

- **不能在渲染进程或主进程里跑任意代码。** 界面代码只有一条入口：经 `component:compile` 编译（esbuild + 黑名单）和 `withOverride` 求值；插件逻辑请放进 MCP 服务器子进程。
- **只能使用白名单模块。** 面板和编辑器组件的运行环境提供 7 个模块：`react`、`react-dom`、`lucide-react`、`@/utils/cn`、`@/store`、`@/store/slices/componentOverride`、`@/utils/tokenEstimate`。可以写 `import`（编译后会变成宿主的 `require`），白名单外报错。`React` 另有位置形参注入，直接引用即可。
- **不能覆盖认证、权限、订阅等级、强制更新相关的组件。** 这些在编译门禁的黑名单里，命中直接拒绝编译。
- **不能读会话令牌。** `electronAPI.notratAuth` 不是插件契约，读取或外传会话令牌属于上架红线；需要用户身份请走插件作用域身份。
- **不能绕过套餐门禁。** 部分内置能力（如 `builtin-channel`、`builtin-evolution`）是 Pro 专属，被拦截时面板会拿到结构化的 `tier_required` 错误。正确做法是提示用户升级并降级，不是屏蔽错误。
- **不能抢内置编辑器已支持的格式。** 匹配顺序是内置编辑器优先（markdown / drawio / pdf / 图片等等），全部不命中才轮到插件。
- **不能在主对话里替用户选中技能。** 那是会话级状态，插件能做的只是注入提示词，让模型自己想到用某个技能。
- **不能把日志写到 stdout。** stdout 是 MCP 的 JSON-RPC 协议通道，日志一律写 stderr。

## 整体架构

左边是跑在外部的插件，中间是唯一的运行态边界，右边是 Notrat 运行时本体：

![Notrat 插件系统全景架构：外部插件生态、运行态边界（JSON-RPC / HTTP SSE / CDP Protocol）与 Notrat Runtime 四层](/shots/plugin-dev/plugin-ecosystem-arch.png)

左区是插件生态，三个已上线的插件就是接入样例：Flow 节点画布、多端同步、一稿多投。每个插件都是同一套组合，manifest 声明加 MCP 服务器加面板；一稿多投额外带了 CDP 浏览器控制，因为要替用户操作网页。

中间是运行态边界。插件与宿主只经三条协议通道通信：JSON-RPC 跑工具调用，HTTP SSE 跑 AI 流式对话，CDP Protocol 跑浏览器自动化。

右区是 Notrat Runtime，从上到下四层：

- **Ⅰ 插件生命周期**：chokidar 监听插件目录发现变更，Plugin Registry 注册六类贡献，MCP Manager 启动子进程，Component Compiler 把面板 TSX 编译成可渲染组件并回注册表。
- **Ⅱ 内置服务**：插件能调用的八个宿主服务，AI 网关、终端、文件系统、知识库、技能市场、定时任务、跨插件调用、匿名身份，都经 `props.serverId`、`props.ctx`、`window.electronAPI` 三个入口暴露。
- **Ⅲ AI 网关**：各服务商直连加 SSE 流式。插件不用再向用户要一遍 API Key，直接经 `props.ctx.ai` 复用宿主已配好的服务商。
- **Ⅳ 安全边界**：三道防线。MCP 子进程沙箱保证插件崩溃不伤宿主，esbuild 黑名单门禁在编译期拦截越权，插件作用域身份不含原始用户 ID。

同一个系统的另一种画法（插件带入什么、宿主提供什么、边界上是哪些 props 接口），见 [面板与界面扩展](/plugin-dev/panels#component-tsx-组件)。

插件包落盘后的样子：

```text
插件包（单文件 JSON 或 目录包 zip）
├── manifest       id · name · version · contributions / mcpServers
├── panels/*.tsx   面板与编辑器源码
└── server/*.js    插件自带的 MCP 服务器

① 界面链路   manifest.contributions ─▶ 贡献注册表（渲染层）─▶ 界面宿主（面板 / 编辑器 / 活动栏 / 状态栏 / 菜单）
             panels/*.tsx  ──编译（esbuild + 门禁）──▶ 同上
② 工具链路   server/*.js  ──stdio · JSON-RPC──▶ MCP 路由（主进程）─▶ 工具表 ─▶ AI 对话 · 斜杠命令 · 面板组件
③ 跨进程     界面宿主 ──callTool──▶ MCP 路由            （面板组件不直接碰子进程）
④ 借用 AI    界面宿主 ──本机 SSE 网关──▶ 用户已配置的 AI 服务商
```

三个要点：

- 插件包是磁盘上的文件。全局插件放 `~/.notrat/plugins/`，工作区插件放 `<工作区>/.notrat/plugins/`；目录一变就热插拔，不用重启应用。
- 两个进程边界。面板组件活在渲染进程（受限），插件逻辑活在 MCP 子进程（沙箱），两者之间靠 `callTool` 通信。
- 贡献全是声明式的。宿主读完 manifest 就知道你要什么，不用等插件代码跑起来再发现。

## 学习路径

1. [快速开始](/plugin-dev/quickstart)：从零做一个能跑起来的最小插件，跑通「装进去、看到效果」这个闭环。
2. [manifest 清单参考](/plugin-dev/manifest)：每个字段的类型、是否必填、怎么写。
3. [面板与界面扩展](/plugin-dev/panels)：面板位置、内容类型、斜杠命令、设置表单、提示词注入。
4. [插件里的 MCP 服务器](/plugin-dev/mcp-servers)：工具怎么暴露、环境变量与占位符、多窗口的 `workspace` 参数。
5. [编辑器与组件扩展](/plugin-dev/editor)：接管文件、多模式切换、大纲对接、组件覆盖。
6. [调试与日志](/plugin-dev/debug)：日志三落点、离线校验面板、常见错误对照表。
7. [打包与发布](/plugin-dev/publish)：两种包形态、版本号规则、上传到插件市场。

## 参考实现

仓库里有一份完整示例，把全部贡献面都用上了：

| 位置 | 内容 |
| --- | --- |
| `examples/plugins/notrat-todo-plugin/` | 完整示例（MCP 服务器 + 命令 + 提示词 + 设置 + 渲染器 + 面板 + 多个 UI 位置 + 工具钩子） |
| `src/skills/plugin-developer/SKILL.md` | 内置技能：让 AI 按流程直接写插件，也含打包与上架（见 [打包与发布](/plugin-dev/publish)） |

::: tip 示例是「取样展示」，不是推荐做法
那份 todo 示例把全部贡献面都铺了一遍，是为了让你一次看到每样长什么样。**一个功能只做一个位置**——同一个面板同时出现在输入框上方、消息区、右侧停靠栏、活动栏，用户得一个个去关。位置由用户要哪个做哪个，而且每个面板他随时能右键「移动到…」自己搬。
:::

::: tip 想先看用户视角
插件在应用里长什么样、入口在哪、怎么安装与更新，见 [插件与扩展市场](/guide/plugins) 与 [扩展管理](/guide/extensions)。
:::
