---
title: manifest 清单参考
---

# manifest 清单参考

manifest 是插件的身份证与说明书。同一个结构有两种载体：

- **单文件包** —— 一个 `<id>.json`，贡献声明与面板源码都在这一个文件里（面板源码内联在 `content.source`）。
- **目录包** —— 一个以插件 id 命名的目录，根下有 `manifest.json`、`panels/*.tsx`、`server/*.js` 等真文件（面板用 `content.sourceFile` 引用）。

目录包是发布到插件市场的推荐形态，也是唯一能用 `${pluginDir}` 引用包内文件的形态。

## 顶层字段

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 | 插件唯一标识，kebab-case（正则 `^[a-z0-9][a-z0-9-]*$`）。目录包的目录名必须与它一致，单文件包的文件名词干也要与它一致 | `"my-plugin"` |
| `name` | `string` | 是 | 显示名，出现在扩展管理列表、插件箱、市场卡片上 | `"我的插件"` |
| `version` | `string` | 是 | 点分数字版本号，客户端的更新检测靠它逐段比大小，**必须严格递增** | `"1.0.0"` |
| `description` | `string` | 否 | 一句话说明，装在插件卡片与市场条目上 | `"给 Notrat 加一个待办面板"` |
| `author` | `string` | 否 | 作者名。**只写字符串**，别写 npm 风格的对象（见下方「字段类型不可信」） | `"某某工作室"` |
| `icon` | `string` | 否 | 包级图标：emoji 或图片 URL（http/https）。缺省时回落第一个 UI 面板贡献的 `icon`，再回落 🧩 | `"🧩"` |
| `type` | `"theme"` \| `"feature"` \| `"bundle"` | 否 | `theme` = 纯样式、`feature` = 含逻辑、`bundle` = 混合。缺省 `bundle` | `"feature"` |
| `manifestVersion` | `1` \| `2` | 否 | `2` = 声明式贡献模型（`contributions` 会被读取）；缺省或 `1` = 旧版包 | `2` |
| `notrat` | `object` | 否 | `{ "minVersion": "1.3.0" }`：声明所需的最低应用版本。当前客户端不依据它拦截——市场的版本门槛来自注册表条目的 `min_app_version`（在插件详情页展示） | `{ "minVersion": "1.3.0" }` |
| `enabled` | `boolean` | 否 | 磁盘上的开关字段。手动拷进插件目录时必须写 `true`，否则装上但不启用；市场安装器会自动补 `true`（除非显式写 `false`） | `true` |
| `scope` | `"global"` \| `"workspace"` | 否 | 插件落点：全局目录或当前工作区目录。缺省 `global`，由应用在启用/迁移时写回 | `"global"` |
| `mcpServers` | `array` | 否 | 插件自带的 MCP 服务器声明，见下节 | 见下 |
| `contributions` | `object` | 否 | 十类声明式贡献，见下节 | 见下 |
| `diy` | `object` | 否 | v1 兼容的组件覆盖与槽位覆盖（**顶层字段，不在 `contributions` 里**） | 见 [编辑器与组件扩展](/plugin-dev/editor) |

::: warning 校验规则（不满足会被拒装）
安装时校验三件事：`id` / `name` / `version` 三个字段都存在；`id` 是 kebab-case；包内容非空。

「内容非空」的判定是：`diy` 有覆盖项，或 `mcpServers` 非空，或 `contributions` 里的 `commands` / `promptSections` / `settings` / `renderers` / `ui` 至少一个非空。**只声明 `editors` / `fileTreeMenus` / `toolHooks` 不算内容**——这类插件请同时带上 `mcpServers` 或一个 `ui` 面板，否则会拿到「插件包内容为空」的报错。

另外，非空判定还没覆盖 `contributions.sidebar`，所以侧边栏面板建议统一用 `ui`（`location: "sidebar-input"`）声明。
:::

## mcpServers 字段

一个插件可以声明多个 MCP 服务器；服务器的运行 id 是 `plugin-<插件id>-<服务器id>`。

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 | 插件内唯一的服务器 id | `"server"` |
| `name` | `string` | 是 | 显示名，日志与错误信息里以「插件名 / 服务器名」出现 | `"Todo Server"` |
| `transport` | `"stdio"` \| `"sse"` \| `"http"` | 是 | 传输方式。本地脚本用 `stdio` | `"stdio"` |
| `command` | `string` | stdio 必填 | 启动命令，写解释器本身。**不能含占位符**——脚本路径请放 `args` | `"node"` |
| `args` | `string[]` | 否 | 启动参数。支持占位符 | `["server/index.js"]` |
| `env` | `object` | 否 | 传给子进程的环境变量。支持占位符；插件显式声明的键**优先于**宿主标准注入 | `{ "MY_KEY": "${settings:apiKey}" }` |
| `url` | `string` | sse/http 必填 | 服务地址 | `"http://127.0.0.1:8787/mcp"` |
| `cwd` | `string` | 否 | 子进程工作目录，缺省 = 插件根目录。**不要留空**：空值会让子进程继承应用的启动目录，那个目录不是目录时就是 Windows 上的 `ENOTDIR` | — |

细节（占位符清单、标准注入的环境变量、日志落点）见 [插件里的 MCP 服务器](/plugin-dev/mcp-servers)。

## contributions 一览

`contributions` 下共有十类声明面。每类都是数组，可以声明多条。

| 字段 | 作用 | 关键字段 | 详见 |
| --- | --- | --- | --- |
| `commands` | 斜杠命令，直调本插件 MCP 工具 | `name`（kebab，无前导 `/`）、`tool`、`argsTemplate`、`usage` | [面板与界面扩展](/plugin-dev/panels) |
| `promptSections` | 往系统提示词注入一段说明 | `slot`、`title`、`content` | [面板与界面扩展](/plugin-dev/panels) |
| `settings` | 每插件独立的声明式设置表单 | `key`、`title`、`fields[]` | [面板与界面扩展](/plugin-dev/panels) |
| `renderers` | 接管某类消息的渲染 | `nodeType`、`source`、`componentId` | [面板与界面扩展](/plugin-dev/panels) |
| `sidebar` | 侧边栏（输入框上方）面板 | `id`、`title`、`content` | [面板与界面扩展](/plugin-dev/panels) |
| `ui` | 任意位置的面板与按钮（推荐） | `id`、`title`、`location`、`content` | [面板与界面扩展](/plugin-dev/panels) |
| `editors` | 按扩展名接管文件编辑器 | `id`、`extensions[]`、`source`/`sourceFile` | [编辑器与组件扩展](/plugin-dev/editor) |
| `fileTreeMenus` | 文件树右键菜单项 | `id`、`label`、`extensions[]`、`uiKey`/`tool` | [面板与界面扩展](/plugin-dev/panels) |
| `toolHooks` | 工具调用前后的钩子（pre 可拦截） | `id`、`on`、`toolPattern`、`tool` | [插件里的 MCP 服务器](/plugin-dev/mcp-servers) |
| `diy`（顶层） | 组件覆盖与槽位覆盖，v1 兼容 | `overrides[]`、`slotOverrides[]` | [编辑器与组件扩展](/plugin-dev/editor) |

## 字段类型不可信：渲染前必须归一化

manifest 的类型声明（`author` 是 `string`）**对第三方包不成立**。社区仓库与 npm 生态里 `author` 常被写成对象：

```json
{
  "author": { "name": "某某", "url": "https://example.com" }
}
```

这类字段会原样存进已安装的插件包里。谁把它直接当 React 子节点渲染，谁就会拿到 `Objects are not valid as a React child`——**整页白屏**，而且只在装了那个插件的人机器上复现。

Notrat 自己的做法是：所有来自插件 manifest 的展示字段统一过一个归一化函数，规则是——

1. 字符串：去掉首尾空白后直接用。
2. 数字：转成字符串。
3. 对象：依次尝试 `name` / `label` / `title` / `text`，取第一个非空字符串。
4. 都不行：返回空字符串，由调用侧给兜底文案（例如名字回落 `id`、图标回落 🧩）。**不做 `JSON.stringify`**——界面上摆一坨 `{"name":"x"}` 比不显示更糟。

插件作者侧的结论很简单：**该写字符串的字段就写字符串**。从 npm 风格 manifest 迁移过来时，记得把这些字段拍平。除 `author` 之外，`icon`、面板的 `title`、设置的 `label`、编辑器的 `label` 都可能被下游当作纯文本渲染，同样别塞对象。

::: tip 同理：插件的其他输入一律当不可信数据处理
面板源码要过编译门禁，面板里渲染的数据要自己防御（`serverId` 可能为空、`callTool` 可能失败），日志里的内容可能带用户数据。这不是「防攻击」的洁癖，而是插件生态里最常见的白屏来源。
:::

## 完整示例

一份把常用贡献面都声明了的目录包 manifest：

```json
{
  "id": "my-plugin",
  "name": "我的插件",
  "version": "1.0.0",
  "description": "演示目录包的 manifest 写法。",
  "author": "某某工作室",
  "icon": "🧩",
  "type": "feature",
  "manifestVersion": 2,
  "enabled": true,
  "scope": "global",
  "mcpServers": [
    {
      "id": "server",
      "name": "我的服务",
      "transport": "stdio",
      "command": "node",
      "args": ["${pluginDir}/server/index.js"],
      "env": {
        "MY_WORKSPACE": "${workspace}",
        "MY_KEY": "${settings:apiKey}"
      }
    }
  ],
  "contributions": {
    "commands": [
      {
        "name": "my-hello",
        "description": { "zh": "打个招呼", "en": "Say hello" },
        "tool": "hello",
        "argsTemplate": "{ \"name\": \"$0\" }",
        "usage": "/my-hello 世界"
      }
    ],
    "settings": [
      {
        "key": "my-plugin",
        "title": "我的插件设置",
        "fields": [
          { "key": "apiKey", "label": "API Key", "type": "secret" },
          { "key": "limit", "label": "上限", "type": "number", "default": 10 }
        ]
      }
    ],
    "ui": [
      {
        "id": "main",
        "title": "我的面板",
        "icon": "🧩",
        "location": "sidebar-input",
        "content": {
          "type": "component",
          "sourceFile": "panels/main.tsx",
          "dataTool": "hello",
          "refreshMs": 5000
        }
      }
    ]
  }
}
```

## 相关文档

- 面板位置、内容类型、斜杠命令、设置表单：[面板与界面扩展](/plugin-dev/panels)
- MCP 服务器、占位符、工具钩子：[插件里的 MCP 服务器](/plugin-dev/mcp-servers)
- 编辑器接管、组件运行环境、组件覆盖：[编辑器与组件扩展](/plugin-dev/editor)
- 打包装箱与版本号规则：[打包与发布](/plugin-dev/publish)
