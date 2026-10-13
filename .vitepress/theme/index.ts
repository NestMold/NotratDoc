import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import Home from "./Home.vue";
import Layout from "./Layout.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  // 布局包一层：默认主题 + 自绘页脚（config.mts 里的 themeConfig.footer 已撤）
  Layout,
  enhanceApp({ app }) {
    // 首页整块由组件接管（frontmatter 里的 hero/features 已撤，见 index.md）
    app.component("Home", Home);
  },
} satisfies Theme;
