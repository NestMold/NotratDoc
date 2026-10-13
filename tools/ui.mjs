// 步骤文件共用的几个小工具。
// 注意：活动栏按钮用真实鼠标事件点不生效（窗口拖拽区吃掉了按下事件），所以这里统一走 JS click。

/** 按「文字完全相等」点一个元素；scope 是 CSS 选择器，默认全文档 */
export const CLICK_TEXT = (text, scope) => `(() => {
  const el = Array.from(document.querySelectorAll(${JSON.stringify(scope || "*")}))
    .filter((x) => (x.innerText || "").trim() === ${JSON.stringify(text)})
    .pop();
  if (!el) return 'NOT FOUND: ' + ${JSON.stringify(text)};
  el.scrollIntoView({ block: 'center' });
  el.click();
  return 'ok';
})()`;

/** 同上，但用「包含」匹配（取最短的那个 = 最贴近这段文字的元素） */
export const CLICK_HAS = (text, scope) => `(() => {
  const hits = Array.from(document.querySelectorAll(${JSON.stringify(scope || "*")}))
    .filter((x) => (x.innerText || "").includes(${JSON.stringify(text)}));
  hits.sort((a, b) => (a.innerText || "").length - (b.innerText || "").length);
  const el = hits[0];
  if (!el) return 'NOT FOUND: ' + ${JSON.stringify(text)};
  el.scrollIntoView({ block: 'center' });
  el.click();
  return 'ok';
})()`;

export const NAV = "nav.overflow-y-auto button"; // 设置左栏的分类按钮

/** 打开设置面板（幂等） */
export const OPEN_SETTINGS = {
  name: "打开设置",
  eval: `(() => {
    if (document.querySelector('nav.overflow-y-auto')) return 'already';
    return ${CLICK_TEXT("设置")};
  })()`,
  after: 1200,
};

/** 关掉设置面板 + 收掉浮层，保证每张图从干净状态开拍 */
export const CLEAN_UI = [
  {
    name: "关掉设置",
    eval: `(() => {
      if (!document.querySelector('nav.overflow-y-auto')) return 'not-open';
      return ${CLICK_TEXT("设置")};
    })()`,
    after: 900,
  },
  { name: "收浮层", key: "Escape" },
  { wait: 500 },
];

/** 收起左下角的「新手任务」浮层（它没有标题栏按钮可点，只能点它自己的 ✕） */
export const CLOSE_CHECKLIST = {
  name: "收起上手清单",
  eval: `(() => {
    const pop = document.querySelector('div[class*="13000"]');
    if (!pop) return 'not-open';
    const bs = Array.from(pop.querySelectorAll('button')).map((b) => ({ b, r: b.getBoundingClientRect() }));
    if (!bs.length) return 'no-button';
    bs.sort((a, x) => x.r.left - a.r.left); // 最右边那个就是 ✕
    bs[0].b.click();
    return 'closed';
  })()`,
  after: 600,
};

/** 关掉底部终端面板 */
export const CLOSE_TERMINAL = {
  name: "关掉终端",
  eval: `(() => {
    const b = document.querySelector('button[title="关闭终端"]');
    if (!b) return 'not-open';
    b.click();
    return 'closed';
  })()`,
  after: 800,
};

/**
 * 打开某个工作区（幂等）。两条路：
 *   · 已经有工作区 → 点左侧面板标题栏的箭头，从菜单里挑；
 *   · 在欢迎屏（没有工作区）→ 直接点「最近使用」里的那一行。
 */
export const OPEN_WORKSPACE = (name) => ({
  name: "打开工作区 " + name,
  eval: `(async () => {
    const nap = (ms) => new Promise((r) => setTimeout(r, ms));
    const bar = () => (document.querySelector('.status-bar-shell') || {}).innerText || '';
    const here = () => bar().includes(${JSON.stringify(name)});
    for (let attempt = 0; attempt < 3; attempt++) {
      const pending = Array.from(document.querySelectorAll('button')).find((e) =>
        (e.innerText || '').includes('在当前窗口打开')
      );
      if (pending) { pending.click(); await nap(8000); continue; }
      if (here()) return 'already';

      const chev = document.querySelector('.left-panel-header-shell button:last-of-type');
      if (chev) {
        chev.click();
        await nap(700);
        const item = Array.from(document.querySelectorAll('button, [role="menuitem"], div'))
          .filter((e) => (e.innerText || '').trim() === ${JSON.stringify(name)})
          .pop();
        if (item) {
          item.click();
          await nap(1000);
          const btn = Array.from(document.querySelectorAll('button')).find((e) =>
            (e.innerText || '').includes('在当前窗口打开')
          );
          if (btn) btn.click();
          await nap(8000);
          continue;
        }
      }

      // 欢迎屏：点「最近使用」里的那一行
      const rows = Array.from(document.querySelectorAll('div, button, li')).filter(
        (e) => (e.innerText || '').includes(${JSON.stringify(name)}) && (e.innerText || '').includes('\\\\')
      );
      rows.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);
      if (rows[0]) {
        rows[0].click();
        await nap(9000);
        continue;
      }
      await nap(2000);
    }
    return here() ? 'ok' : 'FAILED';
  })()`,
  after: 1500,
});
