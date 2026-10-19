---
title: 打包与发布
---

# 打包与发布

插件在你自己机器上跑通之后，这一页讲怎么把它交给别人：选包形态 → 打包 → 上架 → 验证。全部动作都不会碰 Notrat 本体。

## 先定包形态

| 你的插件 | 包形态 | 分发通道 |
| --- | --- | --- |
| 有 `mcpServers`（`server/*.js` 这类真文件） | **zip 目录包** | 官方插件市场（走审核）或社区仓库（Release zip 资产） |
| 有 `content.sourceFile` / `editors[].sourceFile` 引用包内文件 | **zip 目录包** | 同上 |
| 纯声明：面板 TSX 内联在 manifest 的 `source` 字符串里 | 单文件 `<id>.json`；社区仓库用根目录 `manifest.json` | 官方市场 / 自建 / 社区仓库（免审核） |

判断方法很简单：**manifest 里有没有 `${pluginDir}`，或者有没有引用包内真文件**。有就必须 zip，`${pluginDir}` 只对目录包解析，单文件包到别人机器上找不到文件。

::: danger 目录包里别夹带构建输入
如果面板源码是「模板 + 内核占位符」（`source` / `sourceFile` 里含 `/*__LPC__*/` 这类全大写注释块），那它是**构建输入**，装到用户机器上会当场 `ReferenceError`。

社区货架的安装器会扫 manifest 引用的面板源码，命中占位符形态直接拒装；插件市场的正规通道也要求你上传的是**构建产物**。发布前自己 grep 一遍最稳妥。
:::

## 打包

两个脚本都**跟着插件项目走**（每个插件项目各复制一份，范本是官方插件 `notrat-flow` 的项目结构），它们复用 Notrat 仓库里的 esbuild / jszip，插件目录本身不装依赖。

### 开发期：单文件包

```bash
node build.mjs
```

编译插件 TSX 成 CJS（经典 JSX，`React.createElement` 由宿主注入），内联进 manifest，写到 `~/.notrat/plugins/<id>.json`，磁盘监听会自动安装并启用。

服务器脚本这类真文件不能进这个包：惯例是放到 `~/.notrat/mcp/`，别放 `plugins/` 目录（那个目录里只该有插件包文件）。

### 发布：zip 目录包

```bash
node build-release.mjs 1.2.0
```

::: warning 版本号必须显式传
不传版本会落到默认的 `1.0.0`。把「默认号包」发上市场会造成**版本倒挂**：老用户收不到更新提醒，新安装的用户反而装到版本号更低的包（真实踩过的坑）。
:::

产物在 `release/<插件>-<版本>/`：

```text
<插件>-<版本>/
├── manifest.json            # zip 内清单（在根目录；id 必须与目录名一致）
├── panels/*.tsx             # 面板源码（manifest 用 sourceFile 引用）
├── server.cjs               # MCP stdio 服务（manifest 用 ${pluginDir} 引用）
├── README.md                # 插件完整文档
├── readme.md                # 市场详情页正文
├── manifest-summary.json    # 权限预览（详情页展示用，随包提交）
├── checksums.txt            # zip 的 sha256 / 大小
└── <插件>-<版本>.zip        # 上传给市场的包
```

打包脚本固定条目顺序与时间戳，**同样的内容两次打包哈希相同**，别用系统「右键压缩」替代，那样哈希每次都不一样，跟 `checksums.txt` 就对不上了。

## 版本号规则

客户端自动检测更新时，唯一依据是**注册表条目的 `version`**（点分数字逐段比较，缺位按 0，所以 `1.2.10 > 1.2.9`）。

- **每次发布都要显式给一个新版本号，且严格递增。**
- 重发同一个版本号不会触发用户端更新（注册表按版本留档）。
- manifest 内的 `version` 与注册表不一致时，**客户端以注册表为准**，发布时保持两者一致。
- `notrat.minVersion`（声明所需的最低应用版本）当前客户端**不依据它拦截**；市场的版本门槛来自注册表条目的 `min_app_version`。

## 上架：两条路线

**官方货架**走「提交 → 人工审核 → 上架」；**社区货架**面向公开仓库——给仓库打好 topic 就会被客户端自动发现，免审核、免提交表单。两边的信任口径不一样：官方条目有每版本的哈希锁定与权限预览背书；社区条目只做规范校验，安装前由用户自行判断可信度。

### 官方货架：提交与审核

在线提交通道建设中，当前把材料发到 `we@nestmold.cn` 就进入审核：

| 交什么 | 说明 |
| --- | --- |
| 插件本体 | 完整 manifest，或可访问的下载链接。带 `${pluginDir}` / `sourceFile` 这类包内真文件的，交 **zip 目录包**：`manifest.json` 放 zip 根目录，id 与目录名一致 |
| 说明材料 | 一句话功能介绍 + 权限用途说明 + 开源地址（如有） |
| 条目展示信息 | `icon`、`category`、`tags`、`readme`（详情页正文）随包一起交，审核通过后录入注册表 |

审核通过后由官方完成上架：包入库 → 计算 SHA-256 → 写入注册表（每个版本带哈希与 `downloadUrl`）→ 详情页的权限预览自动生成。之后发新版，就是把新版本插到队首，旧版本仍可下载。

**社区货架**不用等审核节奏，分发方式见下一节。

## 社区货架：开源仓库 + topic 自动上架

社区货架没有提交入口，也不经过人工审核。客户端会定期按 GitHub topic 搜索公开仓库，命中后抓仓库根目录的 `manifest.json`，规范校验通过就自动出现在「插件市场 → 插件 → 社区插件」。

### 第 1 步：仓库根目录放 `manifest.json`

- 仓库必须**公开**；`manifest.json` 必须在**根目录**。安装器只认这个位置，放在 `plugins/` 子目录里抓不到。
- 最小字段：`id`、`name`、`version`、`description` 非空；`contributions`（对象）或 `mcpServers`（数组）至少有一个且形状正确。
- 抓不到 manifest 的仓库**不会出现在货架**（网络失败与根目录没有 manifest 同口径，一律隐藏）；抓到了但字段不合规的仍会列出，标「不符合规范」并禁用安装。
- **`author` 建议写明**：字符串 `"张三"`，或对象 `{ "name": "张三", "url": "https://…" }`（详情页可点主页）。不写会回落成仓库所有者；**不要写「Notrat」「Notrat Community」「巢墨科技」等平台名冒充官方**，社区条目免审核，署平台名会让所有插件看起来同源。
- `id` 是插件身份，换 id 等于换一个插件；同一台机器上别让目录包和单文件包用同一个 id 混装（目录包优先）。

### 第 2 步：给仓库打 topic

GitHub 仓库首页 → 右侧 **About** 的齿轮 → **Topics**，填入：

```text
notrat
notrat-plugin
latex          ← 换成你的项目相关标签
markdown
productivity
```

`notrat`、`notrat-plugin` 是上架用的默认 topic，两个都打最稳：客户端会分别按 `topic:notrat`、`topic:notrat-plugin` 搜索并合并去重，**命中任意一个**就能被发现；两个都打也兼容后续按 AND 查询的版本。

除此之外，**再补 2–5 个和项目本身相关的 topic**（上面的 `latex` / `markdown` / `productivity` 只是示例）：它们不参与货架发现，但决定用户在 GitHub 按功能搜索时能不能找到你。按插件实际做的事选，例如 `pdf`、`mcp`、`obsidian-plugin`、`ai-agent`、`note-taking`。

::: tip 写法与坑
- topic 只能用小写字母、数字和连字符。`Notrat Plugin` 带空格会被拆成两个 topic，等于没打。
- GitHub 仓库搜索**默认不包含 fork**。只在 fork 上打 topic 不会上架；请把插件放独立仓库，或在原仓库上打。
- 仓库名和 description 会参与分类推断，写清楚「做什么」；只写一个 `id` 很难被搜到。
- Gitee 也有搜索路径，但其公开搜索接口目前不返回结果；优先用 GitHub。
:::

### 第 3 步：等发现缓存过期

社区货架列表有 **30 分钟**内存缓存。打完 topic 后最多半小时出现在客户端；重启客户端会立即重新拉取。搜插件名确认条目名称、简介、版本与仓库里的 `manifest.json` 一致。

### 第 4 步：发对包（带构建步的必看）

发现之后，安装器按这个顺序取包：

1. **Release 资产优先**：先取仓库 latest release 上的 `.zip` 资产（你发布脚本的产物），并过一道**版本闸**，资产里的版本**低于**仓库 HEAD 的 manifest 版本时不采用（宁可回落源码，也不让用户悄悄降级）。
2. **回落仓库分支 zip**：这是仓库里的原始源码。
3. **装前闸**：分支 zip 里 manifest 引用的面板源码若还带构建占位符，直接拒装，把运行时的 `ReferenceError` 提前成安装失败。

所以：**带构建步的插件，请务必发 Release zip 资产**，并保证资产里的版本不低于仓库 HEAD 的 `manifest.json` 版本。打包方法见上面的「打包」一节。

### 上架检查清单

| 检查项 | 要求 |
| --- | --- |
| 仓库 | 公开仓库，根目录有 `manifest.json` |
| topic | `notrat` 或 `notrat-plugin` 至少一个；推荐两个都打，再补 2–5 个项目相关 topic |
| manifest | `id` / `name` / `version` / `description` 非空；`contributions` 或 `mcpServers` 形状正确 |
| 署名 | `manifest.author` 写作者本人或团队；不写会回落成仓库所有者；不冒用 Notrat / 巢墨等官方名 |
| 版本 | Release 资产版本 ≥ 仓库 HEAD manifest 版本；包内 manifest 与资产版本一致 |
| 构建产物 | zip 里是构建后的面板源码，不含 `__LPC__` 等占位符 |
| 体积 | 官方上架 zip ≤ 20MB / ≤ 200 文件；社区安装器 zip ≤ 64MB / ≤ 500 文件 |
| 内容 | 详情页与示例用中性文案，不含个人文档；不含密钥、令牌、隐私日志 |
| 验证 | 客户端「插件市场 → 插件 → 社区插件」能搜到并安装成功 |

::: warning 免审核 ≠ 免校验
社区条目只做 manifest 形状与包结构校验，不背书安全性。作者仍需遵守下面的「安全红线」；客户端里也会明确提示「免审核，仅做规范校验」。
:::

## 包限制与红线

| 限制 | 值 |
| --- | --- |
| zip 大小 | 官方上架 ≤ 20MB；社区安装器 ≤ 64MB |
| 文件数 | 官方上架 ≤ 200；社区安装器 ≤ 500 |
| 扩展名白名单 | `.json .js .mjs .cjs .ts .tsx .css .scss .html .md .txt .svg .png .jpg .jpeg .webp .gif .ico .woff .woff2 .ttf .map .yaml .yml`（25 项，白名单外一律拒收） |

**内容红线**：市场素材（详情页文案、截图、示例）不得包含个人文档内容（剧本、回忆录等），示例一律用中性文案。

**安全红线**（违反即拒绝上架）：

- 不得读取或外传会话令牌。`electronAPI.notratAuth` 不是插件契约；需要用户身份请走插件作用域身份（`electronAPI.pluginIdentity.getIdentity`）。
- 不得覆盖认证、权限、订阅等级、强制更新相关的内置组件（这类覆盖会被编译门禁直接拒绝）。
- 不得绕过套餐门禁。被拦截时你会拿到 `{ success: false, code: "tier_required", requiredTier }`，正确做法是提示用户升级并降级。
- 不得把令牌、密钥、用户隐私写进日志。第三方插件的日志只落用户本机，用户随时会把它发出来。

## 发布后验证

```bash
# 1) 注册表里能查到（后端直读）
curl -s https://notrat.cn/plugins/plugins.json | grep -o '"id":"<你的id>"' | head -1
# 2) zip 能下载且哈希对得上（downloadUrl 从条目的 versions[0] 取）
curl -sL "<downloadUrl>" -o /tmp/x.zip && sha256sum /tmp/x.zip   # 对照 checksums.txt
```

3. 站点详情页搜插件名，看简介、权限预览、版本号。
4. 客户端 → 插件市场 → 官方插件 tab → 安装 → 面板 / 入口出现 → 跑一遍冒烟。

::: tip 缓存
后端响应是 no-cache，但 CDN 与客户端列表可能延迟 30 秒到 5 分钟。复核时带 `cache: "no-store"`。
:::

## 客户端会怎么装

zip 会被下载校验（sha256）后解包到 `~/.notrat/plugins/<id>/`；写入顺序上 **`manifest.json` 最后落盘**（监听以它出现为安装信号），因此不会出现「脚本还没到位就被拉起」。装完默认启用（除非 manifest 里显式写了 `"enabled": false`）。

## 更新是怎么被用户收到的

- 客户端启动后拉取官方市场与社区货架的版本号，与本机已装版本对比（**6 小时节流**）。
- **使用插件时**（打开主面板 / 点入口）如发现新版，弹窗询问「立即更新 / 暂不 / 不再提示」；「暂不」本次启动内静默，「不再提示」对该插件持久静音。
- 扩展管理页也可以手动「检测更新」，发现新版时对应条目直接出现更新按钮，一键升级（复用市场安装通道，装完自动重载）。

## 高频坑

- **dev 包与市场包 id 打架**：开发机上的 `~/.notrat/plugins/<id>.json`（`build.mjs` 写的）与市场装的目录包 `~/.notrat/plugins/<id>/` 同 id 时，**目录包胜出**，dev 热更新会失效。测市场安装前先把 dev 包改名，测完改回。
- **版本只升不降**：客户端按版本号比较，降号老用户看不到更新。
- **哈希不一致**：只可能是打包方式变了（系统压缩、改动了文件时间戳）。用 `build-release.mjs` 重新打包。
- **同一 id 两种包形态并存**：目录包与单文件包同 id 时目录包优先；发布时统一只用一种。
