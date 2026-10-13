// 第六批：活动栏右键 / 上手清单 / 终端 / 图谱 / 插件市场 / 导出
import { W, DEMO_URL, LOADED, IN_DEMO, SWITCH_TO_DEMO, NO_SPELLCHECK } from "./demo-ws.mjs";
import { CLICK_TEXT, CLICK_HAS, CLEAN_UI, CLOSE_CHECKLIST, CLOSE_TERMINAL } from "./ui.mjs";

// 活动栏按钮：真实鼠标事件到不了（拖拽区），右键菜单改走 JS 派发 contextmenu
const AB = (label) => `(() => {
  const el = Array.from(document.querySelectorAll('.activity-bar-item'))
    .filter((x) => (x.innerText || '').includes(${JSON.stringify(label)}))
    .pop();
  if (!el) return 'NOT FOUND: ' + ${JSON.stringify(label)};
  const r = el.getBoundingClientRect();
  const o = { bubbles: true, cancelable: true, view: window, button: 2, buttons: 2,
              clientX: Math.round(r.left + r.width / 2), clientY: Math.round(r.top + r.height / 2) };
  el.dispatchEvent(new MouseEvent('contextmenu', o));
  return 'menu';
})()`;

// 活动栏点了哪个按钮就把主视图切到哪，所以每段结束都要切回工作台
const BACK_TO_WORKBENCH = { name: "回工作台", eval: CLICK_TEXT("工作台"), after: 1500 };

export default {
  steps: [
    // 重载一次：演示工作区里新加的 [[wiki 链接]] 要重新建索引，图谱才有连线
    { name: "重载页面", goto: DEMO_URL },
    { name: "应用就绪", waitFor: LOADED, timeout: 90000 },
    SWITCH_TO_DEMO,
    { name: "工作区就绪", waitFor: IN_DEMO, timeout: 40000 },
    ...CLEAN_UI,
    CLOSE_CHECKLIST,

    // ── 上手清单（标题栏右上角「新手任务 n/7」） ──────────────────────
    { name: "打开上手清单", eval: CLICK_HAS("新手任务"), after: 1200 },
    { name: "清单已开", waitFor: `document.body.innerText.includes('自定义偏好设置')`, timeout: 6000 },
    { name: "上手清单", shot: "guide/getting-started", size: W, clip: [8, 430, 320, 458], wait: 500 },
    CLOSE_CHECKLIST,

    // ── 活动栏右键菜单 ───────────────────────────────────────────────
    { name: "右键「图谱」", eval: AB("图谱"), after: 900 },
    { name: "右键菜单已开", waitFor: `document.body.innerText.includes('隐藏此按钮')`, timeout: 5000 },
    { name: "活动栏右键菜单", shot: "guide/activity-bar-context", size: W, clip: [0, 55, 400, 175], wait: 400 },
    { name: "关菜单", size: W, mouse: "left", at: [700, 620] },
    { wait: 500 },

    // ── 终端 ─────────────────────────────────────────────────────────
    { name: "打开终端", eval: CLICK_TEXT("终端"), after: 2500 },
    NO_SPELLCHECK,
    { name: "终端", shot: "guide/terminal", size: W, clip: [312, 660, 1096, 232], wait: 1500 },
    CLOSE_TERMINAL,

    // ── 图谱 ─────────────────────────────────────────────────────────
    { name: "打开图谱", eval: CLICK_TEXT("图谱"), after: 3000 },
    { name: "图谱", shot: "guide/graph", size: W, wait: 1500 },
    BACK_TO_WORKBENCH,

    // ── 扩展（插件市场） ─────────────────────────────────────────────
    { name: "打开扩展", eval: CLICK_TEXT("扩展"), after: 3000 },
    // 市场是异步拉的（缓存过期时先显示「加载中…」）——等它真的铺出卡片再拍
    { name: "市场已载", waitFor: `!document.body.innerText.includes('加载中') && document.body.innerText.includes('Flow 节点画布')`, timeout: 40000 },
    { name: "扩展", shot: "guide/market", size: W, wait: 1500 },
    // 注意：活动栏上也有个「Flow 节点画布」标签，所以这里按 span 的类名精确取卡片标题
    { name: "打开插件详情", eval: `(() => {
      const spans = Array.from(document.querySelectorAll('span.truncate.text-sm.font-medium'));
      const el = spans.find((s) => (s.innerText || '').trim() === 'Flow 节点画布');
      if (!el) return 'NOT FOUND';
      (el.closest('div[class*=rounded-xl]') || el).click();
      return 'ok';
    })()`, after: 2000 },
    { name: "详情已开", waitFor: `document.body.innerText.includes('权限与能力')`, timeout: 10000 },
    { name: "插件详情", shot: "guide/market-plugin-detail", size: W, clip: [442, 205, 548, 480], wait: 1000 },

    // ── 导出（活动栏「导出」= 设置面板的 export 页） ──────────────────
    { name: "打开导出", eval: CLICK_TEXT("导出"), after: 2500 },
    { name: "导出", shot: "guide/export", size: W, wait: 900 },
    { name: "导出格式", shot: "guide/export-formats", size: W, clip: [300, 500, 880, 80], wait: 400 },
  ],
};
