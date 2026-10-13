// 第八批：欢迎屏
//
// 两个坑：
//  ① 应用每次启动都会把内置 demo 工作区（<userData>\demo-workspace）塞进「最近工作区」，
//     它的路径里带 Windows 用户名 —— 截图要公开，必须去掉。渲染层有
//     electronAPI.workspace.removeRecent，直接调；
//  ② 「最近工作区」的真相在主进程内存里，改完要整页重载一次才会重新取。
import { W, DEMO_URL, LOADED } from "./demo-ws.mjs";
import { CLEAN_UI, CLOSE_CHECKLIST, CLOSE_TERMINAL } from "./ui.mjs";

const EDIT_RECENT = `(async () => {
  const api = window.electronAPI.workspace;
  const demo = (await api.getRecent()).filter((p) => /demo-workspace$/i.test(p));
  for (const p of demo) await api.removeRecent(p);
  // 这两个只是先登记进列表（截图里的「最近使用」好看些），不真的打开
  for (const p of ['G:\\\\tmp\\\\知识库', 'G:\\\\tmp\\\\周报']) await api.addRecent(p);
  return { removed: demo, now: await api.getRecent() };
})()`;

export default {
  steps: [
    { name: "整理最近工作区", eval: EDIT_RECENT, after: 600 },

    // 整页重载：让欢迎屏重新读一遍列表（顺便把主窗口拉回一个干净状态）
    { name: "重载", goto: DEMO_URL },
    { name: "应用就绪", waitFor: LOADED, timeout: 120000 },
    ...CLEAN_UI,
    CLOSE_CHECKLIST,
    CLOSE_TERMINAL,

    // 重载后如果自动恢复了上次的工作区，就关掉它回到欢迎屏
    { name: "打开工作区菜单", eval: `(() => {
      const chev = document.querySelector('.left-panel-header-shell button:last-of-type');
      if (!chev) return 'no-chevron';
      chev.click();
      return 'ok';
    })()`, after: 900 },
    { name: "关闭工作区", eval: `(() => {
      const it = Array.from(document.querySelectorAll('*')).filter((e) => (e.innerText || '').trim() === '关闭工作区');
      if (!it.length) return 'NOT FOUND';
      it[it.length - 1].click();
      return 'ok';
    })()`, after: 2500 },
    { name: "欢迎屏在", waitFor: `document.body.innerText.includes('最近使用')`, timeout: 15000 },
    { name: "欢迎屏", shot: "guide/welcome", size: W, wait: 1200 },
  ],
};
