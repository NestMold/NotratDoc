// 第五批：设置面板（纯净版可见的六个分类 + 一个锁定态示例）
import { W, IN_DEMO, SWITCH_TO_DEMO } from "./demo-ws.mjs";
import { CLOSE_CHECKLIST } from "./ui.mjs";

// 活动栏的「设置」用真实鼠标点不生效（窗口拖拽区抢了按下事件），只能走 JS click。
const CLICK_TEXT = (text, scope) => `(() => {
  const el = Array.from(document.querySelectorAll(${JSON.stringify(scope || "*")}))
    .filter((x) => (x.innerText || "").trim() === ${JSON.stringify(text)})
    .pop();
  if (!el) return 'NOT FOUND: ' + ${JSON.stringify(text)};
  el.scrollIntoView({ block: 'center' });
  el.click();
  return 'ok';
})()`;

const NAV = "nav.overflow-y-auto button";

const cat = (label, shot, extra = {}) => [
  { name: "点「" + label + "」", eval: CLICK_TEXT(label, NAV), after: 900 },
  { name: shot, shot: "guide/" + shot, size: W, wait: 500, ...extra },
];

export default {
  steps: [
    SWITCH_TO_DEMO,
    { name: "工作区就绪", waitFor: IN_DEMO, timeout: 40000 },

    // 上一轮可能停在设置面板 / 新手任务浮层上，先清干净，保证每张图从同一起点拍
    { name: "先关掉设置", eval: `(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').trim() === '设置');
      if (document.querySelector('nav.overflow-y-auto') && b) { b.click(); return 'closed'; }
      return 'not-open';
    })()`, after: 900 },
    { name: "关掉浮层", key: "Escape" },
    { wait: 500 },
    CLOSE_CHECKLIST,

    { name: "打开设置", eval: CLICK_TEXT("设置"), after: 1200 },
    { name: "设置已开", waitFor: `!!document.querySelector('nav.overflow-y-auto')`, timeout: 8000 },
    { wait: 700 },
    { name: "设置左栏", shot: "guide/settings-nav", size: W, clip: [52, 40, 220, 860], wait: 400 },

    ...cat("通用", "settings-general"),
    // 通用页里截一段「卡外段头 + 白卡」的分组版式（设置页的排版规则，见 guide/settings.md）
    { name: "设置分段版式", shot: "guide/settings-sections", size: W, clip: [400, 180, 900, 430], wait: 400 },
    ...cat("外观", "settings-appearance"),
    { name: "设置主题选择", shot: "guide/settings-theme-picker", size: W, clip: [410, 340, 900, 158], wait: 400 },
    ...cat("编辑器", "settings-editor"),
    ...cat("面板", "settings-panels"),
    ...cat("扩展管理", "settings-extensions"),
    ...cat("开发者", "settings-developer"),

    // 纯净版被锁的分类：点进去看提示长什么样
    ...cat("AI", "settings-locked"),
  ],
};
