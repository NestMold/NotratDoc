<script setup>
/**
 * 全站页脚（经 theme/Layout.vue 的 layout-bottom 插槽挂在每一页，含首页）。
 * 原来只有 config.mts 里 themeConfig.footer 的两行居中纯文本，现在拆成：
 *   左：品牌（logo + Notrat + 标语「本地优先的 AI 工作台」）
 *   右：三组链接（文档 / 支持 / 条款）——把原来埋在正文里的协议页、
 *       「加入交流群」和官网、仓库都收进来到处可达
 *   底行：© 2026 巢墨科技工作室 / NestMold + 回到顶部
 * 样式在 custom.css 的「页脚」段，配色只用纸墨 token，暗档自动跟着翻。
 */
import { withBase } from "vitepress";

const cols = [
  {
    title: "文档",
    links: [
      { text: "使用教程", link: "/guide/" },
      { text: "插件开发", link: "/plugin-dev/" },
      { text: "平台文档", link: "/platform/" },
      { text: "更新记录", link: "/changelog/" },
    ],
  },
  {
    title: "支持",
    links: [
      { text: "常见问题", link: "/guide/faq" },
      // 锚点照 VitePress 生成的 id（emoji 保留在 slug 里，构建产物实测为 #💬-加入交流群）
      { text: "加入交流群", link: "/guide/faq#💬-加入交流群" },
      { text: "软件官网", link: "https://notrat.cn", external: true },
      {
        text: "文档仓库",
        link: "https://github.com/NestMold/NotratDoc",
        external: true,
      },
    ],
  },
  {
    title: "条款",
    links: [
      { text: "用户协议", link: "/platform/user-agreement" },
      { text: "隐私政策", link: "/platform/privacy-policy" },
      { text: "服务条款", link: "/platform/service-terms" },
    ],
  },
];

/** 回到顶部：动效偏好开了 reduced-motion 就瞬移，别平滑滚 */
function toTop() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}
</script>

<template>
  <footer class="nr-footer">
    <div class="nr-footer-inner">
      <div class="nr-footer-brand">
        <a class="nr-footer-lockup" :href="withBase('/')">
          <img :src="withBase('/logo.png')" alt="" class="nr-footer-logo" />
          <span>Notrat</span>
        </a>
        <p>本地优先的 AI 工作台</p>
      </div>

      <nav class="nr-footer-nav" aria-label="页脚">
        <div v-for="c in cols" :key="c.title" class="nr-footer-col">
          <h3>{{ c.title }}</h3>
          <ul>
            <li v-for="l in c.links" :key="l.link">
              <a
                :href="l.external ? l.link : withBase(l.link)"
                :target="l.external ? '_blank' : undefined"
                :rel="l.external ? 'noreferrer' : undefined"
                >{{ l.text }}</a
              >
            </li>
          </ul>
        </div>
      </nav>
    </div>

    <div class="nr-footer-inner nr-footer-bottom">
      <span>© 2026 巢墨科技工作室 / NestMold</span>
      <button type="button" class="nr-footer-top" @click="toTop">
        回到顶部 ↑
      </button>
    </div>
  </footer>
</template>
