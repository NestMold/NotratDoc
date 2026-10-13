---
layout: home
title: Notrat 文档
titleTemplate: 本地优先的 AI 工作台

hero:
  name: Notrat 文档
  text: 本地优先的 AI 工作台
  tagline: 一边是所见即所得的 Markdown 编辑器，一边是能读写文件、执行命令、调用工具的 AI。这里是它的完整说明书。
  image:
    src: /logo.png
    alt: Notrat
  actions:
    - theme: brand
      text: 从安装开始
      link: /guide/install
    - theme: alt
      text: 功能地图
      link: /guide/
    - theme: alt
      text: 插件开发
      link: /plugin-dev/

features:
  - icon: 📥
    title: 第一次用？
    details: 从下载安装、首次启动引导，到写出第一篇 Markdown —— 三篇走完，十分钟上手。
    link: /guide/install
    linkText: 开始使用
  - icon: 🧭
    title: 想知道某个功能在哪？
    details: 工作区、编辑器、AI 对话、专家、连接器、技能、插件、主题、面板、快捷键 —— 每个页面配实机截图逐个讲。
    link: /guide/
    linkText: 功能地图
  - icon: 🔌
    title: 想给 Notrat 写插件？
    details: manifest 怎么写、面板怎么挂、MCP 服务器怎么起、怎么打包发布到插件市场。
    link: /plugin-dev/
    linkText: 插件开发
  - icon: 📋
    title: 这一版改了什么？
    details: 从 1.2.8 到 1.3.5 的完整更新记录，按版本翻阅。
    link: /changelog/
    linkText: 更新记录
---

## 这份文档包含什么

| 板块 | 内容 |
| --- | --- |
| **[使用教程](/guide/)** | 从安装到进阶的完整教程，每个页面配实机截图 |
| **[插件开发](/plugin-dev/)** | 插件 manifest、面板、MCP 服务器、调试与发布 |
| **[平台文档](/platform/)** | 用户协议、隐私政策、服务条款、授权商与激活码 |
| **[更新记录](/changelog/)** | 逐版本的更新说明（用户版） |

::: tip 文档对应版本
教程与截图基于 **Notrat 1.3.5** 的界面。应用更新后，设置项的位置可能发生调整，以应用内实际界面为准。
:::

## 一句话认识 Notrat

- **写**：富文本 / 源码双模式，所见即所得，`Ctrl+/` 随时切换。
- **管**：左侧文件树管理工作区，多标签、多窗口，`.md` 文件双击即开。
- **问**：右侧 AI 对话能读写当前文件、执行终端命令、调用连接器（MCP）工具。
- **扩展**：技能 / 连接器（MCP）/ 专家（智能体）/ 插件 四类扩展，一键从扩展市场安装。
- **本地优先**：文件在你的磁盘上，AI 服务商由你自己配置。
