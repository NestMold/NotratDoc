// 演示工作区（所有截图都用它，路径改这里一处即可）
export const DEMO_DIR = "G:\\tmp\\我的笔记";
export const DEMO_URL = "http://localhost:46817/?workspace=" + encodeURIComponent(DEMO_DIR);
export const W = "1440x900";
export const LOADED =`!!document.querySelector('.activity-bar') && document.body.innerText.includes('新手任务')`;
export const IN_DEMO = `((document.querySelector('.status-bar-shell')||{}).innerText||'').includes('我的笔记')`;

// 编辑区默认开着拼写检查，中英混排的代码块会被划满红波浪线——截图里很难看，先关掉。
export const NO_SPELLCHECK = {
  name: "关拼写检查",
  eval: `(() => {
    const off = (root) => Array.from(root.querySelectorAll('[spellcheck], [contenteditable]'))
      .forEach((e) => { try { e.spellcheck = false; e.setAttribute('spellcheck', 'false'); } catch {} });
    off(document);
    return 'ok';
  })()`,
  after: 300,
};

// 应用会按上次会话恢复工作区，所以每批开始前都强制切到演示工作区。
export const SWITCH_TO_DEMO = {
  name: "切到演示工作区",
  eval: `(async () => {
    const nap = (ms) => new Promise((r) => setTimeout(r, ms));
    const bar = () => (document.querySelector('.status-bar-shell') || {}).innerText || '';
    const pick = (text) =>
      Array.from(document.querySelectorAll('button, [role="menuitem"], div'))
        .filter((e) => (e.innerText || '').trim() === text)
        .pop();
    for (let attempt = 0; attempt < 3; attempt++) {
      // 上一轮可能停在「打开工作区」对话框上，先确定掉
      const pending = Array.from(document.querySelectorAll('button')).find((e) =>
        (e.innerText || '').includes('在当前窗口打开')
      );
      if (pending) { pending.click(); await nap(8000); continue; }
      if (bar().includes('我的笔记')) return 'already';
      const chev = document.querySelector('.left-panel-header-shell button:last-of-type');
      if (!chev) { await nap(2000); continue; }
      chev.click();
      await nap(600);
      const item = pick('我的笔记');
      if (!item) { await nap(1500); continue; }
      item.click();
      await nap(900);
      const btn = Array.from(document.querySelectorAll('button')).find((e) =>
        (e.innerText || '').includes('在当前窗口打开')
      );
      if (btn) btn.click();
      await nap(8000);
    }
    return bar().includes('我的笔记') ? 'switched' : 'FAILED';
  })()`,
  after: 4000,
};
