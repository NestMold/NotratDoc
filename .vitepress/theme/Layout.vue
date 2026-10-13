<script setup>
/**
 * 主题布局：包一层默认主题，把自绘的 Footer 挂到 layout-bottom 插槽。
 * （layout-bottom 在每一页都会渲染，所以首页也有页脚。）
 */
import DefaultTheme from "vitepress/theme";
import Footer from "./Footer.vue";

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #layout-bottom>
      <Footer />
    </template>
  </Layout>
</template>
