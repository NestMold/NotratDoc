import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Notrat 文档",
  description: "本地优先的 AI 工作台 —— 使用教程、插件开发、平台文档与版本更新记录",
  lang: "zh-CN",
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true, // 文档仍在补写，允许暂缺的交叉引用
  head: [
    ["link", { rel: "icon", href: "/favicon.ico" }],
    ["meta", { name: "theme-color", content: "#3b82f6" }],
    // logo.png 是深蓝描线，暗色档几乎看不见 —— 反白一下（同应用内做法）
    ["style", {}, ".dark .VPImage.logo { filter: brightness(0) invert(1); }"],
  ],

  themeConfig: {
    siteTitle: "Notrat 文档",
    logo: "/logo.png",

    nav: [
      { text: "使用教程", link: "/guide/", activeMatch: "^/guide/" },
      { text: "插件开发", link: "/plugin-dev/", activeMatch: "^/plugin-dev/" },
      { text: "平台文档", link: "/platform/", activeMatch: "^/platform/" },
      { text: "更新记录", link: "/changelog/", activeMatch: "^/changelog/" },
      // 软件官网（下载 / 用户中心 / 激活码兑换都在那边），外链默认新标签打开
      { text: "官网", link: "https://notrat.cn" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "开始使用",
          items: [
            { text: "总览与学习路径", link: "/guide/" },
            { text: "安装与首次启动", link: "/guide/install" },
            { text: "五分钟写出第一篇", link: "/guide/first-note" },
          ],
        },
        {
          text: "核心功能",
          items: [
            { text: "工作区与文件管理", link: "/guide/workspace" },
            { text: "编辑器", link: "/guide/editor" },
            { text: "编辑器进阶（表格 / 代码 / 图表 / 图片）", link: "/guide/editor-advanced" },
            { text: "AI 对话", link: "/guide/chat" },
          ],
        },
        {
          text: "配置 AI",
          items: [
            { text: "接入 AI 服务商", link: "/guide/ai-setup" },
            { text: "模型与参数", link: "/guide/ai-models" },
          ],
        },
        {
          text: "扩展能力",
          items: [
            { text: "专家（智能体）", link: "/guide/experts" },
            { text: "连接器（MCP）", link: "/guide/mcp" },
            { text: "技能", link: "/guide/skills" },
            { text: "插件与扩展市场", link: "/guide/plugins" },
            { text: "扩展管理", link: "/guide/extensions" },
          ],
        },
        {
          text: "界面与个性化",
          items: [
            { text: "界面总览", link: "/guide/interface" },
            { text: "活动栏与面板", link: "/guide/panels" },
            { text: "主题与外观", link: "/guide/themes" },
            { text: "设置面板全解", link: "/guide/settings" },
            { text: "快捷键", link: "/guide/shortcuts" },
          ],
        },
        {
          text: "进阶玩法",
          items: [
            { text: "IM 插件（远程助手）", link: "/guide/im-plugin" },
            { text: "图谱", link: "/guide/graph" },
            { text: "悬浮便签与桌面悬浮器", link: "/guide/widgets" },
            { text: "导出与分享", link: "/guide/export" },
            { text: "账号、版本与数据", link: "/guide/account" },
          ],
        },
        {
          text: "遇到问题",
          items: [
            { text: "常见问题 FAQ", link: "/guide/faq" },
            { text: "术语表", link: "/guide/glossary" },
          ],
        },
      ],
      "/plugin-dev/": [
        {
          text: "插件开发",
          items: [
            { text: "总览", link: "/plugin-dev/" },
            { text: "快速开始", link: "/plugin-dev/quickstart" },
            { text: "manifest 清单参考", link: "/plugin-dev/manifest" },
            { text: "面板与界面扩展", link: "/plugin-dev/panels" },
            { text: "MCP 服务器", link: "/plugin-dev/mcp-servers" },
            { text: "编辑器与组件扩展", link: "/plugin-dev/editor" },
            { text: "调试与日志", link: "/plugin-dev/debug" },
            { text: "打包与发布", link: "/plugin-dev/publish" },
          ],
        },
      ],
      "/platform/": [
        {
          text: "平台文档",
          items: [
            { text: "总览", link: "/platform/" },
            { text: "用户协议", link: "/platform/user-agreement" },
            { text: "隐私政策", link: "/platform/privacy-policy" },
            { text: "服务条款", link: "/platform/service-terms" },
            { text: "授权商与激活码", link: "/platform/reseller" },
          ],
        },
      ],
      "/changelog/": [
        {
          text: "版本更新记录",
          items: [
            { text: "全部版本", link: "/changelog/" },
            { text: "1.3.5", link: "/changelog/v1.3.5" },
            { text: "1.3.4", link: "/changelog/v1.3.4" },
            { text: "1.3.3", link: "/changelog/v1.3.3" },
            { text: "1.3.2", link: "/changelog/v1.3.2" },
            { text: "1.3.1", link: "/changelog/v1.3.1" },
            { text: "1.3.0", link: "/changelog/v1.3.0" },
            { text: "1.2.9", link: "/changelog/v1.2.9" },
            { text: "1.2.8", link: "/changelog/v1.2.8" },
          ],
        },
      ],
    },

    outline: { level: [2, 3], label: "本页导航" },
    docFooter: { prev: "上一篇", next: "下一篇" },
    lastUpdatedText: "最后更新",
    returnToTopLabel: "回到顶部",
    sidebarMenuLabel: "目录",
    darkModeSwitchLabel: "主题",
    lightModeSwitchTitle: "切换到浅色",
    darkModeSwitchTitle: "切换到深色",

    search: {
      provider: "local",
      options: {
        translations: {
          button: { buttonText: "搜索文档", buttonAriaLabel: "搜索文档" },
          modal: {
            noResultsText: "没有找到结果",
            resetButtonTitle: "清除条件",
            footer: { selectText: "选择", navigateText: "切换", closeText: "关闭" },
          },
        },
      },
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/NestMold/NotratDoc" },
    ],

    footer: {
      message:
        'Notrat · 本地优先的 AI 工作台　·　<a href="https://notrat.cn" target="_blank" rel="noreferrer">软件官网 notrat.cn</a>',
      copyright: "© 2026 巢墨科技工作室 / NestMold",
    },
  },
});
