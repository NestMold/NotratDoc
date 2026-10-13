import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import Home from "./Home.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 首页整块由组件接管（frontmatter 里的 hero/features 已撤，见 index.md）
    app.component("Home", Home);
  },
} satisfies Theme;
