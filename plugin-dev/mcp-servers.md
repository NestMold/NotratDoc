---
title: MCP 服务器
---

# MCP 服务器

插件的「大脑」跑在一个独立的 MCP 服务器子进程里。面板组件活在渲染进程、拿不到 Node 能力，所有需要读写文件、发网络请求、跑长任务的逻辑都放进这个子进程，通过工具（tools）暴露出去。

宿主负责拉起它、注入环境、给它配一个运行 id、把它的日志引到你能看到的地方；你只负责在 stdio 上说 JSON-RPC。

## 声明一个服务器

```json
{
  "mcpServers": [
    {
      "id": "svc",
      "name": "我的服务",
      "transport": "stdio",
      "command": "node",
      "args": ["${pluginDir}/server/index.js"],
      "env": { "MY_LIMIT": "${settings:limit}" }
    }
  ]
}
```

| 字段 | 说明 |
| --- | --- |
| `id` | 插件内唯一。运行 id 是 `plugin-<插件id>-<服务器id>`，日志文件名、`callTool` 的第一个参数都用它 |
| `name` | 显示名，日志与错误信息里以「插件名 / 服务器名」出现 |
| `transport` | `stdio` / `sse` / `http`。本地脚本用 `stdio` |
| `command` | 启动命令，写解释器本身（`node` / `python` / `uvx` …）。**不能含占位符**，脚本路径请放 `args` |
| `args` | 启动参数，支持占位符 |
| `env` | 追加的环境变量，支持占位符；同名的键**你的声明优先于宿主标准注入** |
| `url` | `sse` / `http` 传输的服务地址 |
| `cwd` | 子进程工作目录，缺省 = 插件根目录。**别留空**：空值会让子进程继承应用的启动目录 |

::: danger 想用真文件就必须是目录包
`${pluginDir}` 只有**目录包**才解析得出（单文件包没有「包根目录」）。带服务器脚本的插件，发布时要打成 zip 目录包，把 `server/*.js` 一起放进去，用 `"args": ["${pluginDir}/server/index.js"]` 引用。

单文件包也能声明 `mcpServers`，但只能靠绝对路径引用机器上的脚本，自己开发时能用，发布给别人一定断。
:::

## 占位符

| 占位符 | 解析成 | 可用位置 |
| --- | --- | --- |
| `${pluginDir}` | 插件根目录（目录包解包后的位置） | `args` / `env` |
| `${pluginId}` | 插件 id | `args` / `env` |
| `${workspace}` | **启动时刻**的当前工作区路径 | `args` / `env` |
| `${windowId}` | 启动窗口标识（`main` / `workspace:xxx`） | `args` / `env` |
| `${settings:<字段key>}` | 用户在插件设置里填的值，未填 = 空串 | `args` / `env` |

`${workspace}` / `${windowId}` 是启动时刻的快照，子进程的 env 在 spawn 时固化，切工作区不会自动改。宿主会在工作区就绪或切换后自动重启服务器（1.5 秒防抖、幂等），但那只是把快照刷新一遍；**多窗口场景请用下面「workspace 参数」的方案**。

## 标准环境变量

每次启动都会注入这几个变量，不用自己声明：

| 变量 | 值 |
| --- | --- |
| `NOTRAT_PLUGIN_ID` | 插件 id |
| `NOTRAT_PLUGIN_DIR` | 插件根目录绝对路径 |
| `NOTRAT_WORKSPACE` | 启动时刻的当前工作区（可能为空串） |
| `NOTRAT_WINDOW_ID` | 启动窗口标识 |
| `NOTRAT_LOCALE` | 当前界面语言（`zh` / `en`） |

## 写一个最小 stdio 服务器

参考实现是零依赖的 `examples/plugins/notrat-todo-plugin/todo-server.js`。协议是 **newline-delimited JSON-RPC**：stdin 每行一个 JSON 对象，stdout 每行一个回复。下面是从它精简出来的骨架：

```js
#!/usr/bin/env node
// NOTRAT_WORKSPACE 等由宿主注入；这里演示协议最小闭环
const readline = require("readline");

const TOOLS = [
  {
    name: "hello",
    description: "打个招呼",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", description: "称呼" } },
      required: ["name"],
    },
  },
];

function callTool(name, args) {
  switch (name) {
    case "hello":
      return `你好，${(args && args.name) || "朋友"}（工作区：${process.env.NOTRAT_WORKSPACE || "无"}）`;
    default:
      return `错误: 未知工具 ${name}`;
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n"); // 只写协议，日志走 stderr
}

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let req;
  try { req = JSON.parse(trimmed); } catch { return; }
  if (req.id === undefined || req.id === null) return; // 通知类消息不回复

  const respond = (result) => send({ jsonrpc: "2.0", id: req.id, result });
  const respondError = (code, message) => send({ jsonrpc: "2.0", id: req.id, error: { code, message } });

  try {
    switch (req.method) {
      case "initialize":
        respond({
          protocolVersion: (req.params && req.params.protocolVersion) || "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "my-server", version: "1.0.0" },
        });
        break;
      case "ping":
        respond({});
        break;
      case "tools/list":
        respond({ tools: TOOLS });
        break;
      case "tools/call": {
        const text = callTool(req.params && req.params.name, (req.params && req.params.arguments) || {});
        respond({ content: [{ type: "text", text }], isError: text.startsWith("错误:") });
        break;
      }
      default:
        respondError(-32601, `Method not found: ${req.method}`);
    }
  } catch (err) {
    respondError(-32603, String((err && err.message) || err));
  }
});
```

三个必须遵守的点：

1. **stdout 只写 JSON-RPC**。想打日志用 `console.error`（stderr），否则既破坏协议、日志也进不了日志面板。
2. **`initialize` / `tools/list` / `tools/call` 三个方法必须实现**，宿主连接后按这个顺序握手。
3. **无 id 的消息是通知**（`initialized` / `cancelled` / `progress`），不要回复。

本地测一遍不用启动应用，管道喂两行即可：

```bash
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n' | node server/index.js
```

## 工具怎么被调用

| 通路 | 谁来调 | 说明 |
| --- | --- | --- |
| 面板 / 编辑器组件 | 你的组件 | `window.electronAPI.mcp.callTool(serverId, toolName, args)`，`serverId` 由 props 传入 |
| 斜杠命令 | 用户敲 `/命令` | `contributions.commands[].tool` 指向工具名 |
| 万能命令 | 用户敲 `/plugin-run` | `/plugin-run <插件id> <工具名> [JSON 参数]`，绕过一切命名冲突 |
| 横向调用 | 别的插件 / 你的组件 | 只要 serverId 在注册表里就能调，包括 `builtin-*` 内置服务器 |
| 主对话的 AI | 模型自然语言 | **默认不包括你的工具**，见下 |

::: warning 自己的工具默认不进主对话的工具表
插件的服务器由宿主直接拉起，不写进用户的「连接器（MCP）」配置，因此模型不会自动看到你的工具：你的面板和命令能调，仅此而已。

要让 AI 用自然语言直接调，得让用户把这个服务器当成普通连接器登记一次（同样的 command / args），或者你在 `promptSections` 里告诉模型「有这些命令可用」。
:::

`callTool` 不抛异常，失败也是正常返回：

```js
const res = await window.electronAPI.mcp.callTool(serverId, "hello", { name: "世界" });
if (res && res.success) { /* res.result 是 MCP 的标准返回 */ }
else { /* res.error 是错误串；套餐门禁时还有 res.code === "tier_required" */ }
```

工具返回的文本，宿主会用一套统一的解包逻辑处理（字符串直用、标准 `content[]` 自动拼接、其余对象 JSON 化），面板的 `dataTool`、`list` 面板、斜杠命令、大纲导入都吃这一套。

## 多窗口：给工具声明 workspace 参数

插件服务器是整个应用共用一个进程的，`NOTRAT_WORKSPACE` 只能存一个值；用户开两个窗口各开各的工作区时，env 里的那个工作区必然是错的。

正解是把工作区变成调用级参数：工具 schema 里声明一个 `workspace` 参数（`inputSchema.properties.workspace`），宿主会在每次调用时自动注入「发起这次调用的窗口」的当前工作区（调用方显式传了值就不覆盖）。

```js
// 分发处：把 args.workspace 合成进本次调用的 env 视图
const callEnv = args && args.workspace
  ? { ...process.env, NOTRAT_WORKSPACE: args.workspace }
  : process.env;
const result = await fn(args || {}, callEnv);
```

- **schema 声明是开关**：没声明 `workspace` 的工具不会被注入，严格校验 schema 的服务器不受影响。
- 面板侧不用管这个参数，组件直接用 `props.ctx.workspace.path`，那是实时的。
- env 仍然有用（单窗口场景、启动时要读的配置），只是别把它当多窗口的正解。

## 工具钩子：toolHooks

声明一个「在别的工具调用前后触发」的钩子工具。适合做守卫（危险操作前先确认）与审计（调用后留痕）。

```json
{
  "contributions": {
    "toolHooks": [
      {
        "id": "guard-clear",
        "on": "pre",
        "toolPattern": "todo_clear",
        "tool": "todo_guard_clear"
      }
    ]
  }
}
```

| 字段 | 说明 |
| --- | --- |
| `id` | 插件内唯一 |
| `on` | `pre`（调用前，**可拦截**）/ `post`（调用后，可观察） |
| `toolPattern` | 前缀匹配的工具名（`"git_"`、`"read_file"`）。缺省 `"*"` = 全部工具 |
| `tool` | 本插件服务器上的钩子工具名 |

- 钩子工具收到的参数是 `{ tool, args }`；`post` 钩子额外收到 `result`。
- **pre 的拦截规则**：钩子返回的文本里出现 `deny` / `拒绝` / `block` / `拦截`（大小写不敏感）任意一个词，这次工具调用就被阻止，该文本作为原因。
- 参照实现：todo 示例的 `todo_guard_clear` 返回 `拦截: 该插件禁止清空全部待办（如需清空请逐个删除）`。
- 钩子工具自己执行失败只记一条警告日志，不会阻止原工具调用。

## 生命周期与重启

| 时机 | 会发生什么 |
| --- | --- |
| 插件启用 / 应用启动 | 每个声明的服务器被拉起（运行 id 见上） |
| 插件禁用 / 卸载 | 进程被停掉 |
| 插件设置改值 | 该插件服务器自动重启（1 秒防抖），占位符与 env 重新解析 |
| 工作区就绪 / 切换 | 已启用且带服务器的插件自动重启（1.5 秒防抖，幂等） |
| 点了插件卡片「重载」 | 禁用再启用：清覆盖 → 重编译面板 → 重启服务器 |

重启是**原子**的：先真正关掉旧连接再连新的，不会出现「旧连接没死透、复用的连接随即被摘掉」的失联状态。

::: tip 服务器进程/脚本对粘贴的路径敏感
`command` 里既不能有占位符，`cwd` 也别留空、别指向一个同名文件，这两处错了在 Windows 上会得到 `ENOTDIR` 这类看不懂的报错。宿主会把这些归类成「插件包不完整 / 路径有问题」并给出人话建议，详见 [调试与日志](/plugin-dev/debug)。
:::

## 日志

服务器的 stderr 是宿主唯一采集的通道，同一份数据有三个落点：面板抽屉（实时）、`~/.notrat/logs/mcp-servers/<serverId>-YYYY-MM-DD.log`（事后）、`yarn log tail <插件id>`（终端与 AI）。写法、命名规则与常见错误对照表见 [调试与日志](/plugin-dev/debug)。

**别把令牌、密钥打进 `console.error`**，日志在用户本机是明文。

## sse / http 传输

服务器不在本机（或你要复用现成服务）时用 `sse` / `http`：只声明 `url`，不需要 `command` / `args`。

```json
{
  "id": "remote",
  "name": "远程服务",
  "transport": "http",
  "url": "http://127.0.0.1:8787/mcp"
}
```

这类服务器没有 stderr 通路，宿主采集不到远端进程的输出。排错要靠服务端自己的日志，或让工具把诊断信息放进返回值里。
