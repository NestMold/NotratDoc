---
title: 面板与界面扩展
---

# 面板与界面扩展

这一页讲插件往界面里放东西的全部方式：面板（`ui` / `sidebar`）、活动栏按钮、斜杠命令、设置表单、提示词片段、消息渲染器、文件树右键菜单。

## 面板贡献：ui 与 sidebar

两条通道，能力不一样：

- **`contributions.ui[]`**：通用 UI 贡献，用 `location` 指定渲染位置。推荐用它，三种内容类型、`sourceFile` 内联、`fullBleed`、`command` 都在这一条通道上。
- **`contributions.sidebar[]`**：旧的侧边栏面板（聊天输入框上方），位置等同于 `location: "sidebar-input"`。能力窄一档：内容类型只有 markdown / list / component，`component` 只认内联 `source`，没有 `sourceFile` / `fullBleed` / `command`。

::: warning 写 `sidebar` 时别用 `sourceFile`
`sourceFile` 的内联只对 `ui[]` 与 `editors[]` 生效：读盘内联、装前占位符扫描、写回剥离三层都只遍历这两处，完全不碰 `sidebar`。在 `sidebar[]` 里写 `sourceFile` 不会报错，但源码永远不会被内联，面板运行时直接编译失败。

要目录包的 `sourceFile`：改用 `ui` + `location: "sidebar-input"`。
:::

```json
{
  "contributions": {
    "ui": [
      {
        "id": "main",
        "title": "我的面板",
        "icon": "🧩",
        "location": "sidebar-input",
        "content": { "type": "component", "sourceFile": "panels/main.tsx" }
      }
    ]
  }
}
```

| 字段 | 说明 |
| --- | --- |
| `id` | 插件内唯一，面板的 key 是 `<插件id>:<id>` |
| `title` | 面板标题，渲染在面板外壳上 |
| `icon` | 可选，emoji 或短文本 |
| `location` | 渲染位置，见下表 |
| `content` | 面板内容，见下方四种类型 |
| `openMode` | 可选，`"default"` 或 `"page"`：触发位（活动栏 / 状态栏 / 侧边栏工具栏）点击时是弹窗还是**直接开成主区整页**。用户在面板右键里设过的打开方式优先于它 |
| `extensions` | 可选，文件类型过滤（小写、不含点）。当前由 `location: "outline"` 消费：只有当前打开文件的扩展名命中时该面板才出现，未声明 = 始终显示 |
| `window` | 可选，仅 `location: "window"` 有意义：独立桌面窗口的默认参数（尺寸、透明度、置顶、鼠标穿透……）。见下方「独立桌面窗口」 |

## 位置一览

| location | 渲染成什么 | 交互方式 |
| --- | --- | --- |
| `sidebar-input` | 聊天输入框上方 | 常驻 |
| `messages-top` | 消息区顶部 | 常驻 |
| `right-panel` | 右侧**真停靠**的一列（占最右、挤压主区），多面板自动变标签式，宽度可拖 240–560px 并记忆 | 常驻；有插件声明时默认展开，状态栏「插件侧栏」开关或栏内按钮收起 |
| `popup` | 居中弹窗 | 由插件箱 / 触发入口呼出 |
| `floating` | 可拖拽悬浮窗 | 常驻，标题栏可拖 |
| `sidebar-toolbar` | 侧边栏工具栏按钮 | 点击呼出弹窗（或整页） |
| `activity-bar` | 左侧活动栏按钮 | 点击呼出弹窗（或整页） |
| `status-bar` | 底部状态栏徽章 | 点击呼出弹窗（或整页） |
| `outline` | 左侧大纲面板（标题列表下方） | 常驻，适合文档导航与结构类工具 |
| `editor-tabs` | 标签栏按钮（文件标签右侧） | 点击呼出弹窗或整页 |
| `editor-header` | 标题栏控制带（「编辑｜源码」那一条） | 与内置控制器并排，点击呼出弹窗或整页 |
| `widget` | 桌面悬浮器窗口（独立窗口） | 常驻，**不支持被用户改位置** |
| `window` | **独立桌面窗口**：每个面板一个真窗口，可透明、置顶、鼠标穿透，位置尺寸记忆 | 常驻，窗口自带标题条（拖拽 / 锁定 / 设置 / 关闭）；桌面上最多同时开 6 个 |
| `page` | 完整主区标签页（像文件标签一样切换、关闭） | 由插件箱点开 |

共 14 个可声明位置；其中 13 个可被用户互移（`widget` 是独立窗口，不在移动目标里）。

::: tip 编辑器里的模式切换别用 editor-tabs
如果你想让用户切换当前这个文件的源码/可视化模式，用 `editors[].dualView` 或 `modes`，它跟着编辑器走、切文件自动显隐。[编辑器与组件扩展](/plugin-dev/editor) 里有说明。

`editor-tabs` / `editor-header` 是与当前文件无关的全局入口，两者定位不同。
:::

## 触发位：活动栏按钮怎么加

`activity-bar` / `status-bar` / `sidebar-toolbar` 是三个「触发位」：贡献本身只是一个按钮或徽章，点击后把面板内容以弹窗形式打开。

```json
{
  "contributions": {
    "ui": [
      {
        "id": "quick",
        "title": "我的工具",
        "icon": "🧰",
        "location": "activity-bar",
        "content": { "type": "component", "sourceFile": "panels/quick.tsx" }
      }
    ]
  }
}
```

- 想在点击时直接开成**整页**而不是弹窗，加 `"openMode": "page"`。
- 用户可以在按钮上**右键 →「移动到…」**，把它搬到其他位置，覆盖持久保存；也可以选「恢复默认位置」。
- 用户还可以在右键菜单里改「打开方式」（弹窗 / 整页），这一层设置优先于 `openMode`。
- 关掉的面板不会消失：插件箱 / 停靠栏的入口仍然在，状态栏开关也会保留（哪怕所有面板都被关过）。

::: tip 打开状态是全局的
「哪个面板正开着」存在全局 store 里，任意按钮点开、Esc 或点遮罩关闭。你不需要自己管理这份状态，只管声明贡献。
:::

## 面板内容：四种类型

### markdown：静态文本

```json
{ "type": "markdown", "text": "**提示**：先选中文本再点下面的按钮。" }
```

纯声明，零编译，适合写说明与提示。

### list：由工具数据渲染的列表

应用自己调 MCP 工具拿数据，按行渲染成带勾选框的列表。最稳的一种：不编译、不求值。

```json
{
  "type": "list",
  "dataTool": "todo_list",
  "refreshMs": 5000,
  "actionTool": "todo_done",
  "actionArgField": "id",
  "addTool": "todo_add",
  "addArgField": "text",
  "addPlaceholder": "添加待办…",
  "deleteTool": "todo_delete",
  "deleteArgField": "id"
}
```

| 字段 | 作用 |
| --- | --- |
| `dataTool` | 拉数据的工具名，挂载时调一次 |
| `refreshMs` | 自动刷新间隔（毫秒）。缺省 `0` = 只在挂载时拉一次 |
| `actionTool` / `actionArgField` | 勾选或点击某一行时调用的工具，参数名由 `actionArgField` 指定（如 `id`） |
| `addTool` / `addArgField` / `addPlaceholder` | 底部输入框与添加按钮调用的工具 |
| `deleteTool` / `deleteArgField` | 每行删除按钮调用的工具 |

**行协议**：工具返回的文本按行解析，只有匹配下面格式的行才有勾选框与动作按钮，其余行当纯文本展示。

```text
[ ] #3 写周报
[x] #7 回邮件
```

即 `[ ]` 或 `[x]`（也接受 `[-]`）紧跟 `#` 加数字 id，再跟正文；id 会作为 `actionArgField` 指定的参数传回工具。工具的返回值可以是字符串、MCP 标准的 `{ "content": [{ "type": "text", "text": "…" }] }`，宿主会先解包再按行解析。

### component：TSX 组件

```json
{
  "type": "component",
  "sourceFile": "panels/main.tsx",
  "dataTool": "todo_list",
  "refreshMs": 3000,
  "fullBleed": false
}
```

| 字段 | 作用 |
| --- | --- |
| `source` | 内联的 TSX 源码（单文件包用） |
| `sourceFile` | 相对包根的源码路径（目录包用，读盘时被内联成 `source`） |
| `dataTool` / `refreshMs` | 同 `list`：宿主异步拉好数据，作为 `props.data` 交给你，并在需要时刷新 |
| `fullBleed` | 仅 `location: "page"` 时有意义：去掉宿主的内边距与面板外壳，让组件铺满主区（画布、看板类面板用） |

> 上表是 `ui[]` 的 `component`。`sidebar[]` 的 `component` 只有 `source` / `dataTool` / `refreshMs` 三个字段，没有 `sourceFile` 与 `fullBleed`。

插件带入声明与逻辑，宿主提供运行时。面板能拿到什么（`props.serverId`、`props.ctx`、`window.electronAPI`）全部来自宿主在运行态边界上的注入，下图就是这条边界的全景：

![Notrat 插件运行时架构：插件带入的三个文件（manifest / MCP 服务器 / 面板）经 props 接口进入 Notrat Runtime，宿主提供 AI 网关、终端、文件系统等核心服务](/shots/plugin-dev/plugin-system-arch.png)

橙色 = 插件开发者带入（manifest / server / panel），蓝色 = Notrat 宿主提供；边界上是 props 注入的接口。上半场是插件侧的三个文件各自被宿主接管的入口（注册清单、spawn 子进程、编译面板），下半场左边是宿主内部实现、右边是它在边界上暴露出来的四个 props 入口：`props.serverId`、`props.ctx.ai`、`props.ctx.workspace`、`window.electronAPI`。

组件收到的 props：

| prop | 说明 |
| --- | --- |
| `serverId` | 本插件第一个 MCP 服务器的运行 id（`plugin-<插件id>-<服务器id>`）。**没启动时是空字符串** |
| `pluginId` | 插件 id |
| `ctx` | 实时运行环境：工作区、窗口、本窗口的 AI 选择、应用版本/主题/语言、当前划词 |
| `data` | `dataTool` 的结果（未声明 `dataTool` 时为空） |
| `dataError` | 拉数据失败时的错误 |
| `launch` | 打开入口携带的参数，形如 `{ params: { filePath, fileName, isFolder } }`（文件树右键菜单用） |

**先防御再调用**：`serverId` 可能为空；`callTool` 失败不抛异常，返回 `{ success: false, error }`，两处都要处理。

```tsx
export default function MyPanel(props) {
  // 钩子写在最前面：serverId 会从空字符串变成非空（服务器连上那一刻），
  // 若把 useState 放在 early return 之后，两次渲染的钩子数不同 → React 抛
  // "Rendered more hooks than during the previous render"，面板降级成错误卡片。
  const [text, setText] = React.useState("");   // React 是位置形参，直接用
  React.useEffect(() => {
    if (!props.serverId) return;                // 空 = 服务器还没起来，等下一次
    window.electronAPI.mcp
      .callTool(props.serverId, "todo_list", {})
      .then((res) => setText(res && res.success ? "加载成功" : "加载失败"))
      .catch(() => setText("加载失败"));
  }, [props.serverId]);
  if (!props.serverId) {
    return <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>连接器（MCP）未就绪</div>;
  }
  return <div style={{ fontSize: 12 }}>{text}</div>;
}
```

::: warning 组件的运行环境
可用模块只有 `react`、`react-dom`、`lucide-react`、`@/utils/cn`、`@/store`、`@/store/slices/componentOverride`、`@/utils/tokenEstimate`，可以写 `import`（编译后交给宿主的 `require` 白名单），白名单外报错；`React` 另外由宿主作为形参注入，直接引用即可。样式必须内联（Tailwind 不扫描插件源码），主题色用 `hsl(var(--foreground))` 这类颜色变量。细节见 [编辑器与组件扩展](/plugin-dev/editor)。
:::

**坏面板不会拖垮宿主**：每个面板都包了错误边界，渲染抛错只会在那个位置降级成一张错误卡片（写着插件 id 与错误信息，带「卸载」按钮），侧边栏与整个界面照常可用。

### command：点了就调工具，不弹面板

```json
{ "type": "command", "tool": "todo_stats", "args": { "scope": "today" } }
```

适合桌面悬浮器、弹窗菜单里的「一键动作」条目：点击直接调用本插件 MCP 工具，不渲染任何面板。

## 整页面板

`location: "page"` 会让面板成为一个**主区标签页**（标签 key 是 `pluginpage:<面板key>`），能与文件标签混排、一键关闭。需要大画布的场景（图谱、看板、仪表盘）用它。

```json
{
  "contributions": {
    "ui": [
      {
        "id": "graph",
        "title": "我的图谱",
        "icon": "🔱",
        "location": "page",
        "content": { "type": "component", "sourceFile": "panels/graph.tsx", "fullBleed": true }
      }
    ]
  }
}
```

- `fullBleed: true` 让组件铺满主区（去内边距与面板外壳），画布类组件要自己管内边距。
- 用户也可以把任何面板右键改成整页打开，或把整页面板搬回其他位置，manifest 里声明的只是默认值。

## 独立桌面窗口：location: "window"

`location: "window"` 让面板**从应用里搬出来**，成为一个真正的操作系统窗口（不是应用内的浮层）。一个面板一个窗口、窗口参数逐面板独立 —— 凡是「想让这个面板一直杵在桌面上」的就用它：桌面挂件、待办清单、监控小窗都算这一类。

```json
{
  "contributions": {
    "ui": [
      {
        "id": "todo",
        "title": "待办清单",
        "icon": "✅",
        "location": "window",
        "content": { "type": "component", "sourceFile": "panels/todo.tsx", "fullBleed": true },
        "window": {
          "width": 260,
          "height": 260,
          "opacity": 0.85,
          "transparent": true,
          "alwaysOnTop": true,
          "clickThrough": false,
          "resizable": false,
          "dragBar": true
        }
      }
    ]
  }
}
```

`window` 里能写什么（都是可选，不写就用下面这行的默认值）：

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `width` / `height` | number | 380 / 480 | 首次打开的窗口尺寸（px）。上限 1600×1200、下限 160×120，越界会被夹回来 |
| `minWidth` / `minHeight` | number | 160 / 120 | 用户手动缩放时的下限 |
| `x` / `y` | number | 不写 | 首次出现的位置（不写就交给系统摆）；会被夹进屏幕可见区域内 |
| `opacity` | number | 0.92 | 整窗不透明度，最低 0.2（再低就点不着了） |
| `transparent` | boolean | true | 窗口背景透明（做透明挂件要它）。**开透明就等于无边框**，写 `frameless: false` 也会被无视 |
| `frameless` | boolean | true | 无系统标题栏（用面板自带的标题条拖拽） |
| `alwaysOnTop` | boolean | true | 常驻最前（含跨虚拟桌面） |
| `clickThrough` | boolean | false | 鼠标穿透：点击落到桌面/下层窗口上。开着的时候**只有**顶部标题条还会接管鼠标，拖它或点设置就能恢复操作 |
| `resizable` | boolean | true | 允许用户拖边缩放 |
| `skipTaskbar` | boolean | true | 不在任务栏 / Dock 里占位 |
| `dragBar` | boolean | true | 顶部标题条显示为拖拽把手 |

几个要点：

- **用户永远优先**：用户在窗口上改的透明度、位置、尺寸会另存一份（用户级），下次打开按用户的来；manifest 里写的是「开发者的默认值」。
- **位置尺寸会自动记忆**：用户把窗口拖到哪儿，下次就开在哪儿（被显示器拔掉/分辨率变化夹回可见区）。
- **上次开着的会自己开回来**：退出时开着的插件窗口，下次启动应用时复原。
- **面板壳与设置是自带的**：你只管写组件内容，标题条、设置面板（不透明度 / 置顶 / 穿透 / 重置尺寸 / 拉回屏内）由宿主提供。
- **主题跟随**：窗口里的组件跑在同一个 React 树与主题上下文里，用 `bg-background` / `text-foreground` 这类语义 class 就跟着用户主题走；自己写死颜色会在暗色主题下瞎。用了 `transparent` 时记得让面板内容自己带圆角和背景，否则内容会直接浮在桌面上。
- **组件里能拿到的**：与其它位置一致（`props.pluginId`、面板自身的信息）。
- 用户在插件箱里对它的右键菜单会多一条「打开独立窗口 / 改到独立窗口打开」，也能从「移动到…」把它搬回应用内。

### 运行时调窗口：window.notratPluginWindow

面板自己的代码也能改本窗参数（比如「贴到桌面边缘时自动变半透明」这种随状态变化的外观）。只在 `location: "window"` 的窗口里有这个全局对象：

```ts
// 面板组件里，任何时机
const opts = await window.notratPluginWindow?.setOptions({ opacity: 0.6 });
window.notratPluginWindow?.setOptions({ clickThrough: true });   // 点桌面不点我
window.notratPluginWindow?.close();                               // 自己关掉自己
```

| 成员 | 说明 |
| --- | --- |
| `key` | 本窗身份 `<插件id>:<面板id>`（只读） |
| `getOptions()` | 当前生效的完整参数 |
| `setOptions(patch)` | 传 `{ opacity, alwaysOnTop, clickThrough, width, height, x, y }` 的子集，生效并返回完整参数（Promise） |
| `close()` | 关掉本窗 |

- 作用域就是本窗，**不用也不该自己拼 key**；别的插件窗口里拿不到你这扇窗的对象。
- 与用户在 ⚙ 面板里改走同一条通道（白名单 + 钳位 + 落盘），写进去的值会被记住。
- 改不了 `transparent` / `frameless` / `skipTaskbar`：窗口已经建出来了，这些只在创建时生效，想变要用户关掉重开。
- 用户改过的参数以用户为准：你 `setOptions` 相当于替用户改了那个值（下次启动按它开）。要「临时变一下」自己存一份状态、需要时再调回去。

::: tip 别和 widget 搞混
`widget` = 桌面悬浮器里的一格（一个共享窗口里的多个入口，位置归悬浮器管）；`window` = 自己独占一个真窗口、参数独立。要每个插件各自一份外观时选 `window`。
:::

## 面板的位置与样式归用户

manifest 声明的是**默认位置**，用户随时可以覆盖：

- **右键 →「移动到…」**：在 13 个位置之间互移，覆盖持久保存，可一键「恢复默认位置」。
- **语义钩子类名**：面板外壳自带 `.notrat-plugin-panel`（所有插件面板）与 `.notrat-plugin-panel-<插件id>`（某个插件），内部还有 `-header` / `-body`；位置容器带 `.notrat-plugin-slot-<location>`。用户可以在对话里让 AI 调用 Slot 覆盖工具改样式（例如「把这个面板改成半透明」），也可以用 DIY 面板手写。插件作者不需要自己实现样式入口。

## 斜杠命令：commands

```json
{
  "contributions": {
    "commands": [
      {
        "name": "my-hello",
        "description": { "zh": "打个招呼", "en": "Say hello" },
        "tool": "hello",
        "argsTemplate": "{ \"name\": \"$0\" }",
        "usage": "/my-hello 世界"
      }
    ]
  }
}
```

| 字段 | 说明 |
| --- | --- |
| `name` | 命令名，kebab-case，**不带前导 `/`** |
| `description` | 字符串，或 `{ "zh": …, "en": … }` |
| `tool` | 本插件第一个 MCP 服务器上的工具名。缺省的推导规则是把 `name` 里的 `-` 换成 `_` |
| `argsTemplate` | 参数模板：`$0`、`$1`…… 依次替换成用户输入的空格分隔参数；写成 `"$0"`（带引号）时会做 JSON 转义后再填。模板拼出来的字符串会被 `JSON.parse`，解析失败则退化成 `{ "args": [...] }` |
| `usage` | 用法提示，显示在斜杠选择器里 |

- 命令是客户端直调 MCP，不经过 AI：用户敲 `/my-hello 世界`，工具立刻被执行，结果直接显示。
- 命令会自动出现在斜杠选择器的「插件」分类下。
- **内置命令优先**；插件之间先启用者赢，被遮蔽的命令仍可用万能命令调用：`/plugin-run <插件id> <工具名> [JSON 参数]`。

## 系统提示词片段：promptSections

```json
{
  "contributions": {
    "promptSections": [
      {
        "slot": "custom",
        "title": "我的插件说明",
        "content": "用户可能让你处理待办，可以用 /my-hello 打招呼。"
      }
    ]
  }
}
```

- `slot` 取值 `custom` / `skills` / `mcp` / `agent` / `im`。`custom` 会渲染成一个独立的 `## {title}` 段落，其余并入对应的运行时块。
- 注入位置在所有对话路径上统一生效（用户 profile 之后、交互组件指令之前）。
- 提示词是「告诉模型你有什么」，不是「替用户做决定」：它不能让模型跳过确认，也不能替用户选中技能。

## 声明式设置：settings

每个插件有自己独立的设置对话框（设置 →「扩展管理」→「插件」卡片上的「配置」，或插件箱里右键插件 tile 的「设置…」）。

```json
{
  "contributions": {
    "settings": [
      {
        "key": "my-plugin",
        "title": "我的插件设置",
        "fields": [
          { "key": "apiKey", "label": "API Key", "type": "secret" },
          { "key": "limit", "label": "上限", "type": "number", "default": 10 },
          {
            "key": "mode",
            "label": "模式",
            "type": "select",
            "options": [{ "label": "自动", "value": "auto" }, { "label": "手动", "value": "manual" }]
          }
        ]
      }
    ]
  }
}
```

- 字段类型：`text` / `textarea` / `number` / `boolean` / `select` / `secret`。`select` 需要 `options`；还可以给 `default`、`description`、`required`。
- 值存进本地设置存储，键是两层：`<设置组 key>` → `<字段 key>`。
- 服务器 env 里用 `${settings:<字段key>}` 引用（例如 `"env": { "MY_LIMIT": "${settings:limit}" }`）。
- 改值后该插件的 MCP 服务器会自动重启（1 秒防抖），新的 env 随之生效。

::: danger 两个必须对齐的地方
1. **`settings[].key` 必须等于插件的 `id`。** 面板里存值用的是设置组的 key，而解析 `${settings:…}` 时是按**插件 id** 去取值的。两者不一致，服务器读到的就是空字符串。
2. **`${settings:…}` 里只写字段 key**，不要写 `设置组key.字段key`。写成 `"${settings:my-plugin.limit}"` 会解析成空串。
:::

## 消息渲染器：renderers

接管某类消息节点的渲染。

```json
{
  "contributions": {
    "renderers": [
      {
        "nodeType": "markdown/code",
        "source": "export default function Code(props){ return React.createElement('pre', null, String(props.code || '')); }"
      }
    ]
  }
}
```

- `nodeType` 取值如 `message/content`、`markdown/code`、`markdown/table`、`markdown/image`；不写 `componentId` 时按内置映射表解析目标组件，也可以显式给 `componentId` 覆盖到指定组件。
- `source` 走与面板组件同一套编译与求值链路（`React` 注入可用）。渲染器**只能内联 `source`**，没有 `sourceFile`。

## 文件树右键菜单：fileTreeMenus

往文件树右键菜单注入条目，点击行为二选一。

```json
{
  "contributions": {
    "fileTreeMenus": [
      {
        "id": "send-to-panel",
        "label": "用我的面板打开",
        "icon": "📡",
        "extensions": ["md", "txt"],
        "uiKey": "main"
      },
      {
        "id": "quick-tool",
        "label": "直接处理这个文件",
        "tool": "process_file",
        "folders": true
      }
    ]
  }
}
```

| 字段 | 说明 |
| --- | --- |
| `id` | 插件内唯一，最终菜单项 id 会加前缀 `plugin:<插件id>:<id>`，与内置项不会冲突 |
| `label` / `icon` | 菜单文字与图标（emoji） |
| `extensions` | 只在这些扩展名上出现（小写、不含点）。缺省 = 所有文件 |
| `folders` | 是否也出现在文件夹上（缺省 `false`；文件夹不按 `extensions` 过滤） |
| `uiKey` | 打开本插件某个 `location: "page"` 的 ui 贡献；文件信息经 `props.launch.params` 传入 |
| `tool` | 直接调用本插件的 MCP 工具，args 自动带上文件信息 |

- `uiKey` 与 `tool` **二选一**。
- `uiKey` 打开的面板会收到 `props.launch.params`：`{ filePath, fileName, isFolder }`。同一个页签里再点别的文件，params 会更新并重新挂载面板。
- `tool` 调用时嵌套的参数是 `{ filePath, fileName }`。
- **多选右键**同样支持：选中多项后，只有每个选中文件都命中 `extensions`（文件夹项豁免，含文件夹需要 `folders: true`）菜单才显示。此时 params 会额外带 `filePaths` 与 `fileNames` 两个数组，`filePath` / `fileName` 回填第一个选中项（兼容只读单个文件的旧面板）。

## 编辑器扩展（另有专页）

`contributions.editors[]` 让插件按扩展名**接管文件编辑**，与面板是两套东西：

```json
{
  "contributions": {
    "editors": [
      {
        "id": "fancy-editor",
        "label": "Fancy 编辑器",
        "extensions": ["fancy", "fnc"],
        "sourceFile": "editor/main.tsx",
        "dualView": ["可视化", "源码"]
      }
    ]
  }
}
```

- **内置编辑器优先**：markdown / drawio / pdf / 图片等内置格式永远轮不到插件，插件接的是新格式。
- 声明 `dualView`（二态）或 `modes`（多模式）即得标题栏模式切换；`outlineTool` 可以把条目送进左侧大纲。
- 组件 props 与面板不同：拿到的是 `file` / `content` / `onChange` / `onSave` / `setStatus`。

完整的字段、props、模式与大纲协议见 [编辑器与组件扩展](/plugin-dev/editor)。

## 面板源码的两种装法

> 这一节讲的是 **`ui[]` 与 `editors[]`**。`sidebar[]` 只支持内联 `source`，没有 `sourceFile`。

| 装法 | 用在哪 | 写法 |
| --- | --- | --- |
| 内联 `source` | 单文件包（`<id>.json`） | TSX 源码作为字符串写在 manifest 里 |
| `sourceFile` | 目录包（zip / 整目录） | 写相对包根的路径（如 `panels/main.tsx`），主进程读盘时把它内联成 `source` |

- **`source` 优先于 `sourceFile`**：两者同时存在时用 `source`，`sourceFile` 会被忽略。
- 路径会被规整：去掉开头的 `./`，并拒绝含 `..` 的路径。
- 作者维护真文件（编辑器能给你语法高亮与补全），宿主只在读盘那一刻内联。

### 构建占位符：`/*__XXX__*/`

有些插件在开发期把面板源码写成「模板 + 内核代码占位符」的形式，发布脚本再把内核代码内联进去（例如把大段编辑器内核塞进面板）。占位符是全大写的注释块：

```text
/*__LPC__*/    /*__WYS__*/    /*__TX__*/
```

**这类源码不能直接装。** 占位符没有被内联就装进去，一打开面板就会 `ReferenceError: XXX is not defined`（整块面板崩掉，但不会影响应用其他部分）。

Notrat 在**社区货架安装**这条通路上加了装前闸：

- 只扫描 manifest 真正引用的面板源码（`ui[].content.source` / `sourceFile`，以及 `editors[].source` / `sourceFile`），不扫整个包；
- 命中 `/*__全大写__*/` 形态的占位符就直接拒装，把运行时崩溃提前成安装失败；
- 单个文件超过 4MB 不扫。

**所以发布带构建步的插件，两点必须做到：**

1. 把构建产物（占位符已内联）作为 **Release 资产 zip** 发布。社区货架优先取 Release 资产，取不到或版本落后才回落仓库分支 zip。分支 zip 里是原始源码，正好会命中装前闸。
2. 或者干脆内联进 manifest 的 `source`，不走构建步。

调试这类问题时，面板的错误信息里会直接写着缺哪个标识符（`ReferenceError: <内核名> is not defined`），对着占位符表就能认出是没跑构建。
