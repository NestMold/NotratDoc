---
title: 快速开始
---

# 快速开始

这一页从零做一个最小可跑的插件：一个面板，装在聊天输入框上方。全程不改动 Notrat 本体，写完就能装进应用看到效果。

最小插件只需要两个文件：一份 `manifest.json`（声明要贡献什么）和一份面板源码。

## 准备

- Notrat 1.3.0 或更高版本。
- 一个能写文件的目录（本文用 `D:\dev\my-plugin\` 举例，你可以换成任何位置）。
- 如果后面要加 MCP 服务器，还需要本机有 Node.js，但第一步用不上。

## 1. 建目录

```
my-plugin/
├── manifest.json
└── panels/
    └── main.tsx
```

这就是**目录型插件包**的形态：目录名就是插件 id，面板是磁盘上真实存在的源文件。

## 2. 写 manifest.json

```json
{
  "id": "my-plugin",
  "name": "我的插件",
  "version": "1.0.0",
  "description": "一个最小可跑的 Notrat 插件：在聊天输入框上方显示当前工作区。",
  "type": "feature",
  "manifestVersion": 2,
  "enabled": true,
  "contributions": {
    "ui": [
      {
        "id": "main",
        "title": "我的面板",
        "icon": "🧩",
        "location": "sidebar-input",
        "content": {
          "type": "component",
          "sourceFile": "panels/main.tsx"
        }
      }
    ]
  }
}
```

几处硬性要求：

- `id` 必须是 kebab-case（小写字母、数字、连字符），且**必须与目录名一致**。
- `version` 必须存在（客户端的更新检测全靠它逐段比大小）。
- `manifestVersion: 2` 是包版本标记。**当前客户端不据此分流**：写 `1`、写 `2`、不写，`contributions` 一样会被读取（仍建议写 `2`）。
- `enabled` 是磁盘上的开关字段。手动把插件拷进 `~/.notrat/plugins/` 时**必须写 `enabled: true`**，否则插件会被装进来但不启用；从插件市场安装时安装器会自动补上（除非你显式写了 `enabled: false`）。
- `content.sourceFile` 是相对包根的路径，主进程读盘时会把它内联成源码，磁盘上保留引用即可，方便你用编辑器改这份真文件。

## 3. 写面板 panels/main.tsx

```tsx
export default function MyPanel(props) {
  const ctx = props.ctx || {};
  const ws = ctx.workspace;
  return (
    <div style={{ padding: 12, fontSize: 13, color: "hsl(var(--foreground))" }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>你好，插件</div>
      <div style={{ color: "hsl(var(--muted-foreground))" }}>
        工作区：{ws ? `${ws.name}（${ws.path}）` : "还没有打开工作区"}
      </div>
      <div style={{ color: "hsl(var(--muted-foreground))" }}>
        本窗口模型：{ctx.ai ? `${ctx.ai.providerName} / ${ctx.ai.model}` : "—"}
      </div>
    </div>
  );
}
```

三条必守的规矩：

1. **只能用白名单模块。** 组件源码经 esbuild 编译后用 `new Function("require", "exports", "module", "React", code)` 求值：里面写的 `import` 会被编译成 `require`，交给宿主的白名单。可用模块只有 `react`、`react-dom`、`lucide-react`、`@/utils/cn`、`@/store`、`@/store/slices/componentOverride`、`@/utils/tokenEstimate`，其余一律报错。`React` 还额外作为位置形参注入，直接引用即可。
2. **样式内联，别写 Tailwind 工具类。** Tailwind 不扫描插件源码，`className="bg-blue-500"` 不会生成任何 CSS。主题色请用颜色变量，例如 `color: "hsl(var(--foreground))"`、背景 `hsl(var(--card))`、描边 `hsl(var(--border))`，这样亮暗主题自动跟随。
3. **默认导出必须是函数。** 宿主只认 `export default` 出来的那个函数（函数组件、类组件都行）。

`props.ctx` 是实时的运行环境元数据（工作区、窗口、本窗口的 AI 选择、应用版本与主题、当前划词），值一变面板自动重渲染。别在挂载时读一次就缓存。

::: tip 先离线校验再装机
面板写错一个字符，在应用里只会看到一张错误卡片。仓库提供离线校验脚本，秒级返回带行列号的错误：

```bash
node scripts/plugin-panel-check.mjs panels/main.tsx
```

退出码 `0` 表示编译、默认导出形状、`renderToString` 冒烟三项全过。详见 [调试与日志](/plugin-dev/debug)。
:::

## 4. 装进 Notrat

<!-- shot: plugin-dev/install-local | 把插件目录拷到 ~/.notrat/plugins/ 下：目录名必须等于插件 id，manifest.json 与 panels/ 一起放进去 -->

**方式 A：直接拷到插件目录（开发期推荐）**

把整个 `my-plugin` 文件夹拷进 Notrat 的全局插件目录：

```
~/.notrat/plugins/my-plugin/
├── manifest.json
└── panels/
    └── main.tsx
```

Windows 上是 `C:\Users\<你>\.notrat\plugins\`。Notrat 启动时会扫描这个目录；应用运行中拷进去，主进程的文件监听也会在 `manifest.json` 落地时触发同步。因为 manifest 里写了 `enabled: true`，装完即启用。

::: warning 整个目录一次拷进去
安装信号是 `manifest.json` 的出现。如果先落 `manifest.json`、面板文件还没到位，这一次会读到空面板源码。整目录一次拷入，或拷完后随便改一下 `manifest.json` 再存一次即可。
:::

**方式 B：用「安装插件包」按钮装单文件包**

设置 →「扩展管理」→「插件」→ 右上角「安装插件包」，选中一个 `.json` 文件即可（装完自动启用）。

![设置 → 扩展管理 → 插件](/shots/plugin-dev/how-to-enable.png)

卡片上的开关是启用/停用，`⋯` 里是「查看日志 / 检测更新 / 重载 / 卸载插件」，本地开发时常用的「重载」就在那儿（改完插件文件就地生效，不用重启应用）。

这个入口只收**单文件包**：面板源码得内联成 `source` 字符串，不能引用外部文件。

```json
{
  "id": "my-plugin",
  "name": "我的插件",
  "version": "1.0.0",
  "type": "feature",
  "manifestVersion": 2,
  "contributions": {
    "ui": [
      {
        "id": "main",
        "title": "我的面板",
        "icon": "🧩",
        "location": "sidebar-input",
        "content": {
          "type": "component",
          "source": "export default function MyPanel(props){ var ws = (props.ctx || {}).workspace; return React.createElement('div', { style: { padding: 12, fontSize: 13 } }, ws ? ws.name : '还没有打开工作区'); }"
        }
      }
    ]
  }
}
```

两种方式都装的是同一个插件，但**同一个 id 不要同时存在单文件包和目录包**：同名时目录包胜出，单文件包的热更新会失效。另外，单文件包在磁盘上的文件名必须是 `<id>.json`（插件 id 取自文件内容，但文件名的词干要能对上，否则会被当成「磁盘上的文件已删除」而被卸掉）。

## 5. 看到效果

- 聊天栏输入框上方出现「我的面板」卡片，显示当前工作区名与本窗口模型。
- 切换工作区、切换模型，面板内容立刻跟着变，这是 `props.ctx` 的实时性。
- **右键面板 →「移动到…」**，可以在 12 个位置之间换位（消息区顶部、右侧停靠栏、悬浮窗、状态栏徽章、活动栏按钮、完整页面……），覆盖会持久保存。
- 设置 →「扩展管理」→「插件」列表里出现「我的插件」，卡片上可以「禁用 / 重载 / 卸载 / 配置」。

## 6. 改代码怎么生效

| 改了什么 | 怎么生效 |
| --- | --- |
| `manifest.json`（贡献声明、标题、位置……） | 覆盖磁盘上的文件即热更新，不用重启应用 |
| 目录包里的面板源码 `panels/*.tsx` | 需要触发一次重读：把 `manifest.json` 重新保存一次，或在插件卡片上「重载」 |
| 单文件包（`~/.notrat/plugins/<id>.json`） | 覆盖文件即热更新（面板源码就在文件里） |
| 插件带的 MCP 服务器脚本 | 在插件卡片上「禁用 → 启用」（脚本是子进程，改文件不会自动重启它） |

面板编译失败不会影响应用：那个位置会降级成一张错误卡片，写清插件 id 与错误信息，并带一个「卸载」按钮。错误原文也可以直接跑离线校验脚本看。

## 下一步

- [插件里的 MCP 服务器](/plugin-dev/mcp-servers)：让插件有自己的工具。面板可以调、斜杠命令可以调，登记后主对话也能调。
- [面板与界面扩展](/plugin-dev/panels)：换面板位置与内容类型（列表 / 富文本 / 组件）、加斜杠命令、加设置表单。
- [manifest 清单参考](/plugin-dev/manifest)：所有字段的类型与必填情况。
- [打包与发布](/plugin-dev/publish)：打成 zip 发布到插件市场。
