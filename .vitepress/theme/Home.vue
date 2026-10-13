<script setup>
/**
 * 首页（VitePress home 布局下由 index.md 里的 <Home /> 挂载）。
 * 视觉口径 = 应用内那套「柔填充圆角块」：实心浅底 + 大圆角 + 无细线描边。
 * 文案沿用原 frontmatter 的 hero / features，一字未改，只换了排版与图标（图标一律内联 SVG，不用 emoji）。
 */
import { withBase } from "vitepress";

const actions = [
  { text: "从安装开始", link: "/guide/install", brand: true },
  { text: "功能地图", link: "/guide/", brand: false },
  { text: "插件开发", link: "/plugin-dev/", brand: false },
];

const ICONS = {
  install:
    '<path d="M12 3v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
  map: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  plugin:
    '<path d="M9 4.5V3.8A1.8 1.8 0 0 1 10.8 2h2.4A1.8 1.8 0 0 1 15 3.8v.7h3.2a1 1 0 0 1 1 1V9h.8A1.8 1.8 0 0 1 21.8 10.8v2.4a1.8 1.8 0 0 1-1.8 1.8H19v4.3a1 1 0 0 1-1 1h-4.3v-.8a1.8 1.8 0 0 0-1.8-1.8h-2.4a1.8 1.8 0 0 0-1.8 1.8v.8H5a1 1 0 0 1-1-1V15h-.8A1.8 1.8 0 0 1 1.4 13.2v-2.4A1.8 1.8 0 0 1 3.2 9H4V5.5a1 1 0 0 1 1-1z"/>',
  changelog:
    '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5z"/><path d="M8 8.5h8M8 12h5.5"/>',
};

const features = [
  {
    icon: ICONS.install,
    title: "第一次用？",
    details:
      "从下载安装、首次启动引导，到写出第一篇 Markdown —— 三篇走完，十分钟上手。",
    link: "/guide/install",
    linkText: "开始使用",
  },
  {
    icon: ICONS.map,
    title: "想知道某个功能在哪？",
    details:
      "工作区、编辑器、AI 对话、专家、连接器、技能、插件、主题、面板、快捷键 —— 每个页面配实机截图逐个讲。",
    link: "/guide/",
    linkText: "功能地图",
  },
  {
    icon: ICONS.plugin,
    title: "想给 Notrat 写插件？",
    details:
      "manifest 怎么写、面板怎么挂、MCP 服务器怎么起、怎么打包发布到插件市场。",
    link: "/plugin-dev/",
    linkText: "插件开发",
  },
  {
    icon: ICONS.changelog,
    title: "这一版改了什么？",
    details: "从 1.2.8 到 1.3.5 的完整更新记录，按版本翻阅。",
    link: "/changelog/",
    linkText: "更新记录",
  },
];

/** 点首页搜索框 = 点导航栏那个搜索按钮（复用 VitePress 本地搜索，不另起一套）。 */
function openSearch() {
  const candidates = [
    ".DocSearch-Button",
    ".VPNavBarSearch button",
    "#local-search button",
    ".VPNavBarSearchButton",
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el) {
      el.click();
      return;
    }
  }
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
  );
}
</script>

<template>
  <div class="nr-home">
    <section class="nr-hero">
      <div class="nr-hero-copy">
        <div class="nr-lockup">
          <img :src="withBase('/logo.png')" alt="Notrat" class="nr-logo" />
          <span>Notrat 文档</span>
        </div>
        <h1 class="nr-title">本地优先的 AI 工作台</h1>
        <p class="nr-tagline">
          一边是所见即所得的 Markdown 编辑器，一边是能读写文件、执行命令、调用工具的
          AI。这里是它的完整说明书。
        </p>

        <button type="button" class="nr-search" @click="openSearch">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <span>搜索文档…</span>
          <kbd>Ctrl K</kbd>
        </button>

        <div class="nr-actions">
          <a
            v-for="a in actions"
            :key="a.link"
            class="nr-btn"
            :class="{ 'nr-btn-brand': a.brand }"
            :href="withBase(a.link)"
            >{{ a.text }}</a
          >
        </div>
      </div>

      <div class="nr-hero-visual">
        <img
          :src="withBase('/shots/guide/interface-overview.png')"
          alt="Notrat 主界面"
        />
      </div>
    </section>

    <section class="nr-features">
      <a
        v-for="f in features"
        :key="f.link"
        class="nr-card"
        :href="withBase(f.link)"
      >
        <span class="nr-card-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            v-html="f.icon"
          />
        </span>
        <h3>{{ f.title }}</h3>
        <p>{{ f.details }}</p>
        <span class="nr-card-link">{{ f.linkText }}</span>
      </a>
    </section>
  </div>
</template>
