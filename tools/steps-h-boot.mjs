// 第七批：启动封面 + 欢迎屏
// 用法：先在**关闭**测试实例的状态下跑 tools/set-recent.mjs，再启动实例，
//       然后立刻跑本文件——封面只在启动头一两秒里存在，所以它排在第一个。
import { W, LOADED, DEMO_URL } from "./demo-ws.mjs";

export default {
  steps: [
    { name: "封面出现", waitFor: `!!document.getElementById('notrat-boot-cover')`, timeout: 30000 },
    { name: "封面还没被摘", waitFor: `(() => { const c = document.getElementById('notrat-boot-cover'); return !!c && !c.classList.contains('notrat-boot-hide'); })()`, timeout: 8000 },
    { name: "启动封面", shot: "guide/boot-cover", size: W, wait: 0 },

    // 等应用真正挂上（#root 有树 + 侧栏在）
    { name: "应用就绪", waitFor: LOADED, timeout: 120000 },
    { name: "封面已收", waitFor: `(() => { const c = document.getElementById('notrat-boot-cover'); return !c || c.classList.contains('notrat-boot-hide'); })()`, timeout: 30000 },

    // ── 欢迎屏（没有工作区时的那一屏） ────────────────────────────────
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
