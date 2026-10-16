---
title: 编辑器与组件扩展
---

# 编辑器与组件扩展

这一页讲三件事：用组件接管文件编辑（`editors`）、组件跑在什么环境里（编译门禁与白名单），以及 v1 时代的组件覆盖（`diy`）。

## editors：按扩展名接管文件

声明「某些扩展名的文件由我的组件打开」。默认适合给私有格式或内置不认识的格式做编辑器（`.excalidraw`、`.kicad_pcb`、自有 DSL……）；想换掉内置的打开方式（自绘表格接管 `.xlsx`、自绘预览接管 `.pdf`），给这一项加 `"override": true`。

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

| 字段 | 说明 |
| --- | --- |
| `id` | 插件内唯一。注册表里的 id 是 `plugin-editor:<插件id>/<编辑器id>`（注意是斜杠；`ui` / `sidebar` 面板才是冒号） |
| `label` | 展示名（错误卡片、编辑器枚举用） |
| `extensions` | 匹配的扩展名（不含点、大小写不敏感） |
| `source` / `sourceFile` | 编辑器组件源码。目录包写 `sourceFile`，读盘时被内联成 `source`；两者同时存在时 `source` 优先 |
| `dualView` | 二态视图声明，`["可视化文案", "源码文案"]`。见下 |
| `modes` | 自定义多模式表，至少 2 个才生效（封顶 6 个）。见下 |
| `outlineTool` | 本插件 MCP 服务器上返回大纲条目的工具名。见下 |
| `override` | `true` = 接管内置格式：本编辑器对该扩展名排在**所有内置编辑器之前**（含二进制那一档）。默认 `false`。见下 |

::: warning 默认不抢内置格式
默认匹配顺序是**内置编辑器优先**：先按内置固定顺序（二进制 → html → drawio → markdown → 各类查看器）逐个匹配，全部不命中才轮到插件，最后才是兜底的代码编辑器。

所以默认情况下给 `.md`、`.drawio`、`.pdf`、图片声明编辑器永远不会被选中——插件接的是新格式。要抢内置，得显式声明 `"override": true`。
:::

### override：接管内置格式

`"override": true` 让本编辑器对该扩展名排在**所有内置编辑器之前**，用来替换内置的打开方式：

- **含二进制那一档**：`.pdf` / `.docx` / `.xlsx` / 图片这类文件平时由内置文档查看器接，接管项抢在它前面才轮得到插件。
- **只作用于自己声明的扩展名**：`extensions: ["xlsx"]` + override 不影响 `.md` / `.pdf` 走内置。
- **多个插件抢同一个扩展名**：按插件**安装顺序**先到先得（先装的那个赢）；启用 / 禁用不改变先后，卸载重装会排到最后。抢不到不是错误：宿主不报错、也不弹提示，只是那个文件始终由先装的那个插件打开。
- **卸载即还**：插件被禁用 / 卸载 / 删包后，该扩展名立刻回到内置编辑器，不会留下打不开的文件。
- 二进制格式的 `props.content` 是 **base64 字符串**（与内置查看器同源）：图片自己拼 `data:image/png;base64,<content>`，解析 docx / xlsx 先 `atob` 转字节。文本格式才是正常文本。

```json
{
  "id": "sheet-editor",
  "label": "表格编辑器",
  "extensions": ["xlsx"],
  "sourceFile": "editor/sheet.tsx",
  "override": true
}
```

- 多个插件、多个编辑器可以共存；同一扩展名按插件安装顺序先到先得。
- 组件是**惰性编译**的：注册时只登记匹配规则，文件真被打开、组件挂载才编译；源码改后重新打开文件即生效（按源码缓存失效）。
- 改 `override` 同样会重新注册（它和源码、扩展名一样在失效判断里），不用重装插件。

::: warning 目录包：改了 .tsx 不生效时，先看 manifest.json
目录包的编辑器源码会在读盘时被内联进内存里的 `source`。之后任何一次写回（启用/禁用、迁移作用域……）都可能把这份内联源码落回 `manifest.json`；而读取侧是「有 `source` 就不读 `sourceFile`」，于是磁盘上的 `.tsx` 从此被无视，改文件、重启都没用。

判断方法：打开 `<插件目录>/manifest.json`，看 `editors[]` 里有没有一个很长的 `source` 字符串。有就把它删掉、只留 `sourceFile`，再重载插件即可。
:::

## 编辑器组件的 props

```tsx
export default function FancyEditor(props) {
  const { content, onChange, onSave, fileName } = props;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <button onClick={onSave}>保存</button>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1, fontSize: 13 }}
      />
    </div>
  );
}
```

| prop | 说明 |
| --- | --- |
| `pluginId` / `ctx` | 与面板组件同源的运行时上下文（工作区、窗口、AI 选择、划词选区、应用信息） |
| `file` | 当前文件对象（含 id / name / path / content） |
| `content` | 当前文件文本。**改内容调 `onChange(text)` 写回 store**，不要自己写盘。应用的 Ctrl+S 与保存按钮读的是同一份数据 |
| `fileName` / `filePath` | 文件名与完整路径 |
| `onChange(text)` | 写回内容 |
| `onSave()` | 走宿主的保存通路 |
| `setStatus(items)` | 往状态栏推送实时状态，见下 |
| `mode` / `onModeSwitch` | 只有声明了 `dualView` 或 `modes` 才下发，见下 |
| `modes` | 声明 `modes` 时下发完整模式表 |

同一文件重新挂载时编辑器组件会按文件重建；面板/编辑器的渲染抛错都被错误边界接住，降级成一张错误卡片（写着插件 id 与错误信息），不会拖垮整个界面。

## dualView：声明即得的双视图切换

画布类、DSL 类编辑器常常需要「可视化 / 源码」两个视图。声明 `dualView` 后：

- 标题栏自动出现与内置 markdown「编辑 | 源码」同款的模式切换 pill，位置就在内置那一排控制带上；
- **作用域正确**：只有当前打开的文件被本编辑器接管时才显示，切到别的文件或页面自动隐藏；
- 组件额外收到 `mode`（`"wysiwyg"` / `"source"`，实时）与 `onModeSwitch(mode)`，用户点 pill 与组件内部主动调走的是同一条通路。

```tsx
export default function FancyEditor(props) {
  const { content, onChange, mode, onModeSwitch } = props;
  if (mode === "source") {
    return <textarea value={content} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }} />;
  }
  return (
    <div style={{ flex: 1 }}>
      {/* 可视化视图；画布内也可以放一个「看源码」按钮 → onModeSwitch("source") */}
    </div>
  );
}
```

::: tip 想要全局入口才用 editor-tabs
`dualView` 是跟编辑器走的模式切换（自动显隐）。想要常驻的全局快捷入口（不跟当前文件走），用 `ui` 贡献的 `editor-tabs` / `editor-header` 位置，两者定位不同，见 [面板与界面扩展](/plugin-dev/panels)。
:::

## modes：自定义多模式

需要两个以上的模式（可视化 / 源码 / 分屏 / 预览……）就声明 `modes`：标题栏会渲染 N 个按钮，每个插件编辑器定义自己的模式组：

```json
{
  "editors": [
    {
      "id": "fancy",
      "extensions": ["fancy"],
      "modes": [
        { "id": "visual", "label": "可视化", "icon": "🎨" },
        { "id": "source", "label": "源码" },
        { "id": "split", "label": "分屏", "icon": "⬒" }
      ]
    }
  ]
}
```

- 组件经 `props.mode`（当前模式 id）与 `props.onModeSwitch(id)` 读写；`props.modes` 同时下发完整模式表（想在组件内部画自己的模式菜单可用）。
- 模式 id 是任意字符串，语义完全由组件解释：`if (mode === "split") return <Split />`。
- 模式状态按编辑器记忆、跨文件保留，与内置的 wysiwyg / source 相互独立。
- **至少声明 2 个才生效**（封顶 6 个）；**声明 `modes` 时 `dualView` 被忽略**。

## setStatus：把实时状态推到状态栏

编辑器组件可以把随状态变化的值（缩放、选中节点数、光标行列……）推到应用状态栏右侧：

```tsx
export default function FancyEditor(props) {
  const { setStatus } = props;
  const [zoom, setZoom] = React.useState(1);
  const [nodeCount, setNodeCount] = React.useState(0);

  React.useEffect(() => {
    setStatus([
      { id: "zoom", text: `${Math.round(zoom * 100)}%`, title: "缩放" },
      { id: "nodes", text: `${nodeCount} 节点`, title: "画布节点数" },
    ]);
  }, [setStatus, zoom, nodeCount]);

  return /* … */;
}
```

- 条目形状 `{ id, text, title? }`；`text` 至少 1 个字符才渲染。
- **上限 6 条、单条 80 字符**（超出截断）；重复上报相同内容不会触发重渲染（可以跟着状态高频调）。
- 清除用 `setStatus([])`；组件卸载时自动清空，不会残留陈旧状态。
- 位置在状态栏右侧、内置 Ln/Col 左侧；无人上报时这块不渲染。
- 区别于 `ui` 贡献的 `status-bar` 位置：那边是**面板/徽章**（可交互、走 dataTool 轮询），`setStatus` 是**编辑器实例的实时状态**。

## outlineTool：接上左侧大纲

大纲面板对插件编辑器的唯一契约是两件事：导入大纲条目、点击时定位。声明一个返回条目的 MCP 工具即可：

```json
{
  "editors": [
    { "id": "fancy", "extensions": ["fancy"], "outlineTool": "fancy_outline" }
  ]
}
```

**工具入参**：宿主调用时自动带 `{ fileName, filePath }`。

**返回值**两种写法都认（宿主会先解包：字符串直用、MCP 标准 `content[]` 自动拼接、其余对象 JSON 化）：

| 形态 | 写法 | 说明 |
| --- | --- | --- |
| JSON 数组（推荐） | `[{"level":1,"text":"标题","anchor":"node-3"}]` | 也接受 `{"items":[…]}` / `{"data":[…]}` / `{"content":[…]}` 包装；`text` 可写成 `title`；`anchor` 可省；`level` 非数或 ≤0 按 1、上限 6；空 `text` 条目丢弃 |
| 行协议 | `1\|标题\|node-3`（每行一条） | 三段：level \| text \| anchor；单段行 = 1 级纯文本；anchor 可省 |

返回合法 JSON 但不是上述结构（例如纯对象 `{"foo":1}`）视为**无条目**，不会按行误渲染。

- **面板侧**：当前文件被本编辑器接管时，左侧大纲 tab 自动改渲染这个工具的条目（层级缩进同内置标题大纲，带刷新按钮与加载/错误态）。
- **定位侧**：用户点条目 → 编辑器组件收到 `notrat-outline-navigate` 事件，自行滚动/定位：

```tsx
React.useEffect(() => {
  const handler = (e) => {
    const d = e.detail;                     // { pluginId, editorId, anchor, item }
    if (d && d.pluginId === props.pluginId) scrollToAnchor(d.anchor);
  };
  window.addEventListener("notrat-outline-navigate", handler);
  return () => window.removeEventListener("notrat-outline-navigate", handler);
}, [props.pluginId]);
```

`anchor` 为空时回退为条目文本；怎么定位（滚动到元素 / 行 / 图形节点）由你的组件决定。

### 用 ui[].extensions 给大纲面板做过滤

`location: "outline"` 的面板可以声明 `extensions`（小写、不含点）：

```json
{
  "ui": [
    {
      "id": "fancy-outline",
      "title": "画布元素大纲",
      "icon": "🗺",
      "location": "outline",
      "extensions": ["fancy", "fnc"],
      "content": { "type": "component", "sourceFile": "panels/outline.tsx" }
    }
  ]
}
```

只有当前打开文件的扩展名命中时该面板才出现。不同格式的编辑器插件可以各自贡献自家格式的大纲面板，互不占用；面板拿文件内容自行解析结构（`props.ctx.workspace` + 自家 MCP 工具）。

未声明 `extensions` = 始终显示；当前没有打开文件时，声明了过滤的面板隐藏。

## 组件运行环境

面板、编辑器、渲染器共用同一条编译与求值链路，所以约束完全一致：

1. 源码经 `component:compile` 编译，esbuild 参数固定为 `loader: tsx`、`jsxFactory: React.createElement`、`jsxFragment: React.Fragment`、`target: es2020`、`format: cjs`，编译超时 5 秒（编辑器宿主侧另有 8 秒兜底）。
2. 编译产物用 `new Function("require", "exports", "module", "React", code)` 求值，`React` 是位置形参。
3. 产物里的 `require("...")` 由一张白名单映射表满足，**列外模块直接抛错**：

```text
react / react-dom / lucide-react
@/utils/cn / @/store / @/store/slices/componentOverride / @/utils/tokenEstimate
```

由此得到三条硬规矩：

- **只能用白名单模块**：`import` 会被编译成宿主的 `require`，白名单内的 7 个模块能正常加载，白名单外报「模块不在可用列表中」。要用 `React.useState` 可以直接引用形参 `React`。
- **样式内联**。Tailwind 不扫描插件源码，`className="flex flex-col h-full"` 不会生成任何 CSS。主题色用颜色变量：`hsl(var(--foreground))`、`hsl(var(--card))`、`hsl(var(--border))`、`hsl(var(--muted-foreground))`……亮暗主题自动跟随。
- **默认导出必须是函数**（函数组件、class 组件都行）。否则报「导出不是函数」并列出实际形状。

**黑名单**：涉及认证、权限、订阅等级、强制更新的组件不允许被覆盖，命中直接拒绝编译。名单在 `component-compiler`（`App.tsx`、`contexts/AuthContext.tsx`、`components/Login/`、`components/Update/ForceUpdateGate.tsx`、`components/ActivityBar/ActivityBar.tsx`、`components/Settings/Settings.tsx`、`hooks/usePermissions`、`services/permissionService`、`services/planPermissionService`）。

::: tip 离线先跑一遍
`node scripts/plugin-panel-check.mjs <文件>` 复刻同一套参数，秒级返回带行列号的错误，退出码非 0 即有问题。见 [调试与日志](/plugin-dev/debug)。
:::

## diy：v1 时代的组件与槽位覆盖

v1 插件包（只有 `diy` + `mcpServers`）向后兼容，仍可用。两件事：

```json
{
  "diy": {
    "overrides": [
      {
        "id": "components/Editor/EditorHeader.tsx#EditorHeader",
        "source": "export default function EditorHeader(props){ return React.createElement('div', null, '被替换的标题栏'); }"
      }
    ],
    "slotOverrides": [
      { "type": "style", "selector": ".sidebar", "value": { "background": "transparent" } }
    ]
  }
}
```

- `overrides[].id` 是被替换组件的复合键 `路径#导出名`；`source` 是替换后的 TSX，走同一条编译链路。
- 覆盖在启用时生效、禁用即还原。多个插件覆盖同一组件时可以共存（各自的键带 `plugin:<插件id>:` 前缀，独立可删），**取最新启用者生效**。
- `slotOverrides[].type` 取值 `style` / `props` / `behavior` / `content`；`selector` 是 CSS 选择器或组件路径。
- **新插件不建议再用 `diy` 做界面改造**：面板有 14 个可声明位置、编辑器有专用贡献面、终端用户还能自己对 `.notrat-plugin-panel-*` 这类语义钩子类改样式。`diy` 主要留给老包与「必须替换某个内置组件」的场景。
