// 第九批：左栏页签（文件 / 大纲 / 反向链接 / 搜索）
//
// 这里要纠正一个常见误会：大纲、反向链接、搜索**不是**编辑器里的浮层，
// 它们是左侧面板的四个页签（源：src/App.tsx:198 LeftPanelTab）。
// 截图就拍左侧面板这一条 —— 页签本身 + 反向链接列表。
import { W, IN_DEMO, SWITCH_TO_DEMO, NO_SPELLCHECK } from "./demo-ws.mjs";

const OPEN = (name) => ({
  name: "打开 " + name,
  eval: `(() => {
    const rows = Array.from(document.querySelectorAll('.tree-container div')).filter(
      (e) => (e.innerText || '').trim() === ${JSON.stringify(name)}
    );
    const el = rows[rows.length - 1];
    if (!el) return 'NOT FOUND';
    el.click();
    return 'opened';
  })()`,
  after: 2000,
});

export default {
  steps: [
    SWITCH_TO_DEMO,
    { name: "工作区就绪", waitFor: IN_DEMO, timeout: 40000 },

    // 写作手册.md 被 配色笔记.md / 产品需求.md 引了 —— 反向链接里才有东西
    OPEN("写作手册.md"),
    NO_SPELLCHECK,
    { name: "滚动到顶", eval: `(() => { document.querySelector('.tiptap-editor')?.closest('div[class*=overflow]')?.scrollTo(0,0); return 'ok'; })()` },

    { name: "切到反向链接页签", clickText: "反向链接" },
    { name: "反向链接已载", waitFor: `document.body.innerText.includes('反向')`, timeout: 8000 },
    // 鼠标甩到正文中间：不甩开的话活动栏上会留着上一个按钮的悬停提示气泡
    { name: "移开鼠标", size: W, mouse: "left", at: [800, 500], hoverOnly: true },
    { wait: 900 },
    { name: "左栏页签", shot: "guide/editor-panels", size: W, clip: [0, 0, 420, 620], wait: 500 },

    { name: "回到文件页签", clickText: "文件" },
    { wait: 600 },
  ],
};
