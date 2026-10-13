// 第四批：编辑器交互（百宝箱 / 斜杠菜单 / 大纲 / 查找 / 表格 / 代码块 / 图片）
import { W, IN_DEMO, SWITCH_TO_DEMO, NO_SPELLCHECK } from "./demo-ws.mjs";

const TOOLBOX_BTN = [1098, 854]; // 工具栏最右的 ⊞

export default {
  steps: [
    SWITCH_TO_DEMO,
    { name: "工作区就绪", waitFor: IN_DEMO, timeout: 40000 },
    { name: "打开写作手册", eval: `(() => {
      const rows = Array.from(document.querySelectorAll('.tree-container div')).filter((e) => (e.innerText || '').trim() === '写作手册.md');
      const el = rows[rows.length - 1];
      if (!el) return 'NOT FOUND';
      el.click(); return 'opened';
    })()`, after: 2000 },
    NO_SPELLCHECK,

    // ── 百宝箱（⊞） ────────────────────────────────────────────────
    { name: "打开百宝箱", size: W, mouse: "left", at: TOOLBOX_BTN },
    { name: "百宝箱已开", waitFor: "document.body.innerText.includes('工具栏样式')" },
    { name: "百宝箱", shot: "guide/editor-toolbox", size: W, clip: [860, 480, 290, 380], wait: 400 },
    { name: "关百宝箱", size: W, mouse: "left", at: [700, 300] },
    { wait: 400 },

    // ── 斜杠命令（只在块首触发，所以先回车开一行空段） ──────────────
    { name: "点段落", size: W, mouse: "left", textHas: "引用块用来放别人的话", scope: ".tiptap-editor p" },
    { name: "回车换行", key: "Enter" },
    { wait: 400 },
    { name: "敲 /", type: "/" },
    { name: "菜单已弹", waitFor: "!!document.querySelector('.slash-menu-popup')", timeout: 6000 },
    { name: "斜杠菜单", shot: "guide/slash-menu", size: W, wait: 600 },
    { name: "关菜单", key: "Escape" },
    { wait: 300 },
    { name: "撤销1", key: "z", ctrl: true },
    { wait: 300 },
    { name: "撤销2", key: "z", ctrl: true },
    { wait: 500 },

    // ── 大纲 ───────────────────────────────────────────────────────
    { name: "切到大纲页签", clickText: "大纲" },
    { wait: 900 },
    { name: "大纲", shot: "guide/editor-outline", size: W, clip: [52, 56, 420, 700], wait: 500 },
    { name: "回到文件页签", clickText: "文件" },
    { wait: 600 },

    // ── 查找替换 ───────────────────────────────────────────────────
    { name: "点正文", size: W, mouse: "left", textHas: "标题层级", scope: ".tiptap-editor h2" },
    { name: "Ctrl+F", key: "f", ctrl: true },
    { wait: 900 },
    { name: "查找替换", shot: "guide/editor-find", size: W, clip: [312, 56, 808, 120], wait: 500 },
    { name: "关查找", key: "Escape" },
    { wait: 400 },

    // ── 表格 ───────────────────────────────────────────────────────
    { name: "点表格", size: W, mouse: "left", sel: ".tiptap-editor .tableWrapper" },
    { wait: 800 },
    { name: "表格", shot: "guide/editor-table", size: W, clip: [330, 340, 800, 260], wait: 500 },

    // ── 代码块 ─────────────────────────────────────────────────────
    { name: "点代码块", size: W, mouse: "left", sel: ".tiptap-editor .node-codeBlock" },
    { wait: 800 },
    { name: "代码块", shot: "guide/editor-code", size: W, sel: ".tiptap-editor .node-codeBlock", wait: 500 },

    // ── 图片缩放 ───────────────────────────────────────────────────
    { name: "点图片", size: W, mouse: "left", sel: ".tiptap-editor .inline-image" },
    { wait: 900 },
    { name: "图片缩放", shot: "guide/editor-image-resize", size: W, clip: [410, 130, 630, 640], wait: 600 },
  ],
};
