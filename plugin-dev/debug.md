---
title: 调试与日志
---

# 调试与日志

插件的调试面很窄，但都很实在：**组件的错误在应用里看得见（错误卡片），服务器的输出在 stderr 里**。这一页把「去哪儿看、怎么看、看到的东西什么意思」串起来。

## 先记住三条

1. **日志一律写 stderr**（`console.error` / `process.stderr.write`）。stdout 是 MCP 的 JSON-RPC 协议通道，往那里写日志既破坏协议、日志也进不了任何地方。
2. **服务器日志按「运行 id」归档**：`plugin-<插件id>-<服务器id>`。你在 `mcpServers` 里声明的 `id` 只决定这个运行 id 的后半段。
3. **组件出错不会白屏**。面板与编辑器都包着错误边界，渲染失败降级成一张错误卡片（写着插件 id 与错误信息），应用其余部分照常可用。

## 日志的三个落点

三个落点读的是**同一份数据**，按场景选：

| 落点 | 位置 | 场景 |
| --- | --- | --- |
| 面板 | 扩展管理 → 插件卡片 →「查看日志」（无 MCP 服务器的包不显示这一项） | 开发时最顺手；多个服务器可切换，行头有「复制」「清空」 |
| 文件 | `~/.notrat/logs/mcp-servers/<serverId>-YYYY-MM-DD.log` | 事后排查；让用户把文件发给你 |
| 命令行 | `yarn log tail <插件id>` | 终端与 AI 读取，不用开应用 |

![插件卡片的「查看日志」](/shots/plugin-dev/pack-log-panel.png)

上图是 LaTeX 助手面板的实时日志：`[stderr]` 行是插件服务器往 stderr 写的内容（`console.error` 就是 stderr），`[system]` 行是宿主记的生命周期标记（进程启动 / 连接断开 / 进程停止）；右上角是行数与「复制」「清空」。

（同一块面板也从「上手引导」弹窗里进得去，只是折在里面。）

### 日志文件

- **文件名**：`<serverId>-YYYY-MM-DD.log`，日期是 **UTC**；serverId 里不安全的字符会被替换成 `_`。
- **行格式**：`[HH:MM:SS.mmm] [stderr|system] 正文`，时间戳同样是 **UTC**（与主进程 `main-*.log` 同源，两个日志的时间可以直接对）。
- **`system` 行是宿主写的生命周期标记**：`--- 进程启动 (pid=…) ---`、`--- 进程停止 ---`、`--- 连接断开 ---`、`--- 启动/连接失败: … ---`。判断「起没起、什么时候断的」先看这几行。
- **单行超 4000 字符会截断**（末尾标「截断」）。
- **单文件超 8MB 轮转**：改名成 `<serverId>-YYYY-MM-DD-<毫秒时间戳>.log` 后继续写新文件。
- **目录保留 7 天**，按修改时间清理。
- 只对 **stdio** 服务器有这条通路；`sse` / `http` 的远端进程输出宿主拿不到。

### 命令行

```bash
yarn log list                      # 四类数据源概览
yarn log servers                   # 哪些服务器有日志
yarn log tail <插件id|serverId>    # 最新日志尾部（-n 100 控制行数）
yarn log errors --local            # 错误记录（--local 只看"仅本地"的）
yarn log calls --failed            # 工具调用历史（只看失败的）
yarn log main --level error        # 主进程日志
```

- 不在 Notrat 仓库目录时，用绝对路径调 `node <Notrat>/scripts/notrat-log.mjs`。
- 任意子命令加 `--json` 输出字段稳定的 JSON，给 AI 或脚本消费。
- `--home <dir>` / `--appdata <dir>` 指向拷过来的日志目录（远程支持场景，不碰本机）。
- **退出码**：`0` = 读取成功（「没有数据」也算成功）；`1` = 用法错误或目标服务器不存在。所以「空结果」与「参数写错」不会被混为一谈。
- 只读，不改任何文件。

::: tip 第三方插件的日志只在本机
第三方插件与用户自配服务器的启动失败、运行报错**只落本机**（含 `~/.notrat/logs/error-reports.json` 里的本地记录），不会上传到服务器——stderr 里可能带凭据，这是有意为之。

反过来说：**别把令牌、密钥、用户隐私打进 `console.error`**，日志在用户机器上是明文。要让用户帮你排查，请让对方用面板「复制」或把日志文件发你。
:::

## 面板离线校验：不用启动应用

面板/编辑器源码在应用里是「编译 → 求值 → 渲染」三步跑起来的，装进去才知道错就太慢了。仓库里的脚本把同一条链路复刻在 Node 里，秒级给出带行列号的错误：

```bash
node scripts/plugin-panel-check.mjs panels/main.tsx
node scripts/plugin-panel-check.mjs panels/main.tsx --data sample-data.json
node scripts/plugin-panel-check.mjs --list tool-output.txt
```

四项检查按序执行：

| # | 检查 | 内容 |
| --- | --- | --- |
| 1 | 编译 | esbuild 参数与宿主完全一致；失败透传 `文件:行:列` 加代码摘录 |
| 2 | 导出 | `default` 必须是函数，否则报「导出不是函数」并列出实际形状 |
| 3 | 渲染 | `renderToString` 冒烟（`useEffect` 不会执行，这是 SSR 的限制）；`--data` 把 JSON 喂进 `props.data` |
| 4 | 行协议 | 加 `--list` 时预览 `dataTool` 的输出会被解析成什么（只有 `[ ] #id 文本` 形态的行可交互） |

**退出码**：`0` = 全部通过；`1` = 有失败项。改到 0 再装机，这一步能省掉绝大多数来回。

模块映射与应用内一致（`react` / `react-dom` / `lucide-react` / 四个 `@/` 模块）；其中 `react-dom` 与三个 `@/` 模块是**替身**（空对象或简单拼接），真实行为仍需装进应用验证——用到替身时脚本会打一行 `ℹ` 提示。**列外模块直接报错**（应用内同样会抛）。

## 常见错误对照表

应用会把这些报错翻译成「哪里坏了 + 怎么办」，原始串一字不动地留在下方（可复制）。对照看更快：

### 启动阶段

| 报错关键字 | 含义 | 怎么办 |
| --- | --- | --- |
| `Command not found: <cmd>` | 电脑上没装这个命令 | 装 Node.js 等运行时，装完**完整重启应用**（新命令要重启才被识别），再点「重载」 |
| `Permission denied executing <file>` | 文件存在但没有执行权限 | macOS / Linux 上 `chmod +x` 该文件；Windows 检查文件是否被占用 |
| `ENOTDIR` / 同名文件被当成了目录 | 启动路径上有个同名文件 | 多半是 `cwd` 留空或指向了文件；把 `cwd` 指向目录（或删掉该字段用默认的插件根目录） |
| `Library not loaded:` / `error while loading shared libraries:` | 系统的 Node 运行环境坏了（缺动态库） | 这是电脑环境的问题，不是插件的问题；按提示 `brew reinstall` 等修好后点「重载」 |
| `ERR_MODULE_NOT_FOUND`，路径在 `~/.notrat/plugins/<插件>/` 里 | **插件包没装全**（安装中断留下的半套文件） | 到扩展管理/插件市场重新安装一次，再点「重载」 |
| `Cannot find module` / `ERR_MODULE_NOT_FOUND`，路径在别处 | 脚本路径写错，或依赖没装 | 检查 `args` 里的路径；依赖类问题在插件自己的目录里装好 |
| `Invalid MCP config` | 启动信息不全（命令 / 参数 / 地址缺） | 检查 `command` / `args` / `url` 是否都写了 |
| `Connection timeout` | 服务起来了但不响应 | 点「重载」重试；反复超时看实时日志里它卡在哪 |
| `exited unexpectedly` | 子进程启动后立刻退出 | 展开实时日志看它最后一行；多半缺依赖或缺文件 |

### 连接阶段（sse / http）

| 报错 | 含义 |
| --- | --- |
| `Authentication failed (401/403)` | 密钥或 Token 无效——检查插件设置里的密钥 |
| `Endpoint not found (404)` | 地址不对——检查 URL 是否完整、是否变更 |
| `Method Not Allowed (405)` | 接口形式变了——检查路径是否需要调整（比如漏了 `/mcp`） |
| `Server error (5xx)` | 对方服务器临时故障，稍后重试 |
| `HTTP connection failed` | 连不上——检查网络与地址 |

### 开发阶段

| 现象 | 原因与处置 |
| --- | --- |
| 面板位置显示一张错误卡片 | 组件编译失败或渲染抛错。卡片上有插件 id 与错误原文；跑 `plugin-panel-check.mjs` 拿带行列号的版本 |
| 「导出不是函数（default 应为 function，实际为 …）」 | 忘了 `export default`，或者导出的是对象/常量 |
| 「模块 "xxx" 不在可用列表中」 | 组件里写了白名单之外的模块——改成 `React.createElement` 或可用的那几个 |
| 面板样式没生效 | Tailwind 不扫描插件源码；`className` 不管用，改用内联样式与 `hsl(var(--…))` 颜色变量 |
| 调用工具返回 `{ success: false }` | 这不是异常，是正常失败返回：看 `error` 字段；若是 `code === "tier_required"`，说明该内置能力要套餐，提示用户升级并降级 |
| 组件里 `props.serverId` 是空串 | 服务器还没连上（或没声明）。**先判断再用**，不要直接 `callTool` |
| `ReferenceError: XXX is not defined`，一打开面板就崩 | 面板源码里的构建占位符（`/*__LPC__*/` 这类）没被内联。发布时要打成构建产物，别直接发源码——见 [面板与界面扩展](/plugin-dev/panels) |
| 日志面板里什么都看不到 | ① 日志写到了 stdout（协议通道，收不到）；② 服务器压根没启动——看卡片上的「运行错误」或 `yarn log errors --local`；③ 禁用→启用一次让服务器重启 |

## 改了没生效？

| 改了什么 | 怎么生效 |
| --- | --- |
| 单文件包（`~/.notrat/plugins/<id>.json`） | 覆盖文件即热更新 |
| 目录包的 `manifest.json`（贡献声明、标题、位置……） | 覆盖文件即热更新，不用重启应用 |
| 目录包里的面板源码 `panels/*.tsx` | 需要触发一次重读：把 `manifest.json` 重新保存一次，或在插件卡片上「重载」 |
| 编辑器源码 `editor/*.tsx` | 同上；若改完毫无反应，先检查 `manifest.json` 里是不是被写入了一份内联的 `source`（见 [编辑器与组件扩展](/plugin-dev/editor)） |
| 插件的 MCP 服务器脚本 | 脚本是子进程，改文件不会自动重启——在插件卡片上「禁用 → 启用」 |
| 插件设置里的值 | 自动重启该插件的服务器（1 秒防抖），新的 env 随之生效 |

## 上线前自检清单

- [ ] 面板/编辑器都跑过 `plugin-panel-check.mjs`，退出码 0。
- [ ] 服务器用一个 `console.error` 打点，能在「查看日志」里看到同一行。
- [ ] 故意写错 `command`，能在插件卡片上看到「运行错误」，`yarn log errors --local` 也有对应记录。
- [ ] 每个工具都能通过 `/plugin-run <插件id> <工具名> {}` 调通。
- [ ] 面板在**没有工作区**、**服务器未启动**两种情况下不崩（此时 `ctx.workspace` 为空、`serverId` 为空串）。
- [ ] 声明了 `promptSections` 的话，问模型「你有哪些能力」，能提到这段说明。
- [ ] 设置改一个值，服务器重启后新值生效（例如让工具把 env 打印出来）。
- [ ] 全流程日志里没有出现任何令牌 / 密钥 / 用户隐私。
