// 第三批：编辑器（工作台模式，写作手册.md 打开）
import { W, IN_DEMO, SWITCH_TO_DEMO } from "./demo-ws.mjs";

const OPEN = (name) => ({
  name: "打开 " + name,
  eval: `(() => {
    const rows = Array.from(document.querySelectorAll('.tree-container div')).filter(
      (e) => (e.innerText || '').trim() === ${JSON.stringify(name)}
    );
    const el = rows[rows.length - 1];
    if (!el) return 'NOT FOUND';
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    el.click();
    return 'opened';
  })()`,
  after: 1800,
});

export default {
  onStart: null,
  steps: [
    SWITCH_TO_DEMO,
    { name: "工作区就绪", waitFor: IN_DEMO, timeout: 40000 },

    // 先摆好标签页：三个文件
    OPEN("写作手册.md"),
    OPEN("README.md"),
    OPEN("产品需求.md"),
    OPEN("写作手册.md"),
    { name: "滚动到顶", eval: `(() => { const s = document.querySelector('.tiptap-editor')?.closest('div[class*=overflow]') || document.querySelector('.tiptap-editor')?.parentElement; if (s) s.scrollTop = 0; window.scrollTo(0,0); return 'ok'; })()` },
    { wait: 800 },

    { name: "编辑器", shot: "guide/editor", size: W, wait: 900 },
    { name: "编辑器标签页", shot: "guide/editor-tabs", size: W, clip: [312, 0, 700, 56], wait: 400 },
    { name: "编辑器工具栏", shot: "guide/editor-toolbar", size: W, clip: [312, 840, 808, 28], wait: 400 },
  ],
};
