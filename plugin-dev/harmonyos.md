---
title: 在鸿蒙（HarmonyOS）上
---

# 在鸿蒙（HarmonyOS）上

同一份插件包，桌面版和鸿蒙版都能装。**声明**（`manifest.json`）和**界面**（TSX）那一层完全一样，差异只在「执行」那一层：你的 MCP 服务器跑在什么 Node 上。

桌面版是把 `command` 当命令去启动一个子进程；鸿蒙设备上**没有 node 可执行文件**（也没有 python、没有 git、没有 Chrome），所以宿主换了一种跑法——把脚本放进自己的 `worker_threads` 里执行，用消息通道伪造 `stdin` / `stdout`。

这带来几条必须知道的边界。

## 能力对照

| 能力 | 桌面 | 鸿蒙 | 说明 |
| --- | --- | --- | --- |
| 面板 / 编辑器组件 / 命令 / 设置 / 文件树菜单 | ✓ | ✓ | 与桌面完全一致 |
| 面板与编辑器的 TSX 现场编译 | ✓ esbuild | ✓ TypeScript | 编译器换了，写法与产物语义一致（见下文） |
| stdio 服务器（`command: "node"` + 脚本） | ✓ 子进程 | ✓ 进程内 | 见[托管模式](#托管模式怎么跑) |
| 随包携带的纯 JS 依赖（`node_modules`） | ✓ | ✓ | 按 Node 常规规则从脚本目录向上解析 |
| 随包携带的原生模块（`.node` 二进制） | ✓ | ✗ | 设备上没有对应 ABI 的预编译产物 |
| 全局 `WebSocket` | ✓（Node ≥ 21） | ✓ | 宿主补了一个 DOM 形状的实现 |
| 全局 `fetch` | ✓ | ✗ | 用 `http` / `https` 内置模块 |
| `npx` / `npm` / `pnpm` / `yarn` / `bun` / `uvx` / `python` / `docker` | ✓ | ✗ | 这些命令在设备上不存在，也不能联网装包 |
| 起外部程序（`child_process.spawn` 浏览器、git、ffmpeg…） | ✓ | ✗ | API 在，但设备上没有可执行文件可起 |
| 终端 / `node-pty` | ✓ | ✗ | 鸿蒙版的终端面板是关闭的 |
| `sse` / `http` 传输的服务器 | ✓ | ✗ | 服务器不在本机，且进程内拿不到 Chromium 的网络栈 |
| 读写文件 | ✓ | ✓ | 家目录在沙箱内；工作区文件要用户授权过的目录 |

## 托管模式怎么跑

宿主命中下面三条时，不会去启动子进程，而是把脚本加载进 `worker_threads`：

1. `command` 属于 node 家族（`node` / `npx` / `npm` / …），且
2. `args` 里有一个**真实存在**的 `.js` / `.cjs` / `.mjs` 文件，且
3. 平台上找不到可用的 node（鸿蒙恒成立）。

然后 `process.stdin` 被换成一条管道、`process.stdout.write` / `process.stderr.write` 改走消息通道、`process.argv` 伪装成 `[node, <你的脚本>, ...args]`，最后 `require(<你的脚本>)`。所以：

- **协议不用改**：仍然是 stdin 逐行读 JSON-RPC、stdout 逐行回。`readline` 照常用。
- **`process.argv` 能读到**，但 `process.argv[0]` 是宿主自己的可执行文件路径，不要拿它当 node 去 spawn。
- **`__dirname` / `require` 解析规则与普通 Node 一致**：脚本所在目录为起点向上找 `node_modules`。
- **没有子进程隔离**：你的脚本崩溃只会终止这一个服务器（宿主会把它标成未连接），不会带崩应用。

::: tip 用哪种写法最稳
入口写成 CJS（`require` / `module.exports`），或者服务器的 `server/` 目录里放一份 `{"type": "module"}` 的 `package.json`。理由是桌面版在用户没装 Node 时会回落到**应用自带的 Node 20.x**，对「内容是 ESM、最近的 `package.json` 又没写 `type: "module"`」的 `.js` 会按 CJS 解析而报错。同一种写法，让它在两边都能起来。
:::

## 不要依赖这几个全局

### `fetch`

鸿蒙运行时**编译期就没开 WebAssembly**，而 Node 自带的 `fetch` 依赖的 undici 要用 WASM 解析 HTTP。所以进程内宿主里 `fetch` 一定失败——宿主给了一个说明原因的实现，而不是一个语焉不详的 `TypeError`。

发 HTTP 请求请用内置模块：

```js
const https = require("https");

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { accept: "application/json" } }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}
```

这套写法在桌面和鸿蒙上是**同一条路径**，不用分平台。

### 不要假设有「外部程序」

`child_process` 在托管模式下是可用的，但设备上没有浏览器、没有 git、没有 python。靠起外部进程完成核心功能的插件（典型的：驱动桌面 Chrome/Edge 用 CDP 发布内容）在手机上跑不通——这不是环境没配好，是平台边界。这类插件请在面板里明确提示「需要桌面版」，而不是让用户对着报错猜。

### `WebSocket` 可以用

宿主给进程内脚本补了一个 DOM 形状的全局 `WebSocket`（`addEventListener("open"/"message"/"close")` + `ev.data`，文本帧给字符串）。所以连本机服务的插件在鸿蒙上能跑。

但如果你的服务器要跟**桌面**上的老 Node（20.x）也兼容，最稳的还是自己带一份 `ws` 放 `args` 指向的目录里，别依赖全局：

```js
let WS = globalThis.WebSocket;
if (typeof WS !== "function") WS = require("ws"); // 桌面老 Node 没有全局 WebSocket
```

## 面板与编辑器组件

TSX 的写法**完全不用改**：白名单模块、`React` 位置形参注入、编译门禁、组件覆盖都一样。

唯一要知道的是编译引擎不同（桌面是 esbuild，鸿蒙是 TypeScript 的 `transpileModule`），两者都只做「类型擦除 + JSX 转换」，不做类型检查。所以：

- 不要依赖 esbuild 专属的行为（例如 `import.meta`、顶层 `await`、装饰器——这些在两种引擎下都不能保证）。
- `jsx` 会转成 `React.createElement` / `React.Fragment`，与桌面一致。
- 语法错误会在编译期报出来，报错文案可能不同，别去匹配报错文本。

## 调试

- **日志**：`console.error` 的输出会进「插件日志」抽屉，与桌面同一处；设备上还可以用 `hilog` 看宿主自己打的平台日志。
- **连接器（MCP）启动失败**：面板上会显示人话的失败原因。鸿蒙特有的几条：`本平台没有 node 可执行文件，改为进程内托管`（正常信息）、`这台 runtime 没编译 WebAssembly…`（说明你的 server 用了 `fetch`）。
- **本地复现**：桌面版设环境变量 `NOTRAT_MCP_INPROCESS=1` 可以强制走同一套托管路径，不用上机就能试出「没有 fetch / 没有子进程」下的表现。

## 发布前自查

- [ ] 服务器入口是 CJS，或者 `server/package.json` 里写了 `{"type": "module"}`
- [ ] 没有 `fetch(`；HTTP 走 `http` / `https`
- [ ] 没有依赖 `npx` / `python` / 外部浏览器 / 外部可执行文件
- [ ] 第三方依赖是纯 JS，且随目录包一起发布
- [ ] 用了 `WebSocket` 的地方，桌面老 Node 有兜底（自带 `ws`）
- [ ] 平台做不了的功能，面板上有明确提示，而不是只留一条报错
- [ ] stdout 只有 JSON-RPC，日志全在 stderr
