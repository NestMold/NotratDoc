// 第 M 批：会员功能页（22 张）——对应 tools/placeholder-shots.py 里的 MISSING 清单。
//
// 前置条件（缺一不可）：
//   1. 测试实例（%APPDATA%\notrat-test）**已登录**，档位 ≥ 基础版；
//   2. 「设置 → AI」里至少接了一个服务商，并且当前模型是**支持思考**的
//      （model-reasoning 那张要有「推理等级」才拍得到）；
//   3. 应用在跑，CDP 端口开着（跑法见 tools/capture-run.mjs 头部注释）。
//
// 跑法：
//   node tools/capture-run.mjs tools/steps-m-member.mjs
//   只补某几张：node tools/capture-run.mjs tools/steps-m-member.mjs --only chat-
//   连 chat-diff（要真跑一次 AI 改文件）一起拍：MEMBER_AI=1 node tools/capture-run.mjs tools/steps-m-member.mjs
//
// 【未实跑】本文件按源码里的 data-tour / 文案选择器写，还没在真实登录态下跑过第一遍。
// 第一次跑大概率要按实际 DOM 微调个别步骤——都集中在标了「待验」的地方：
//   · 填 @ 的那一步（composer 是 Slate，要用 beforeinput 派发，见 TYPE_INTO_COMPOSER）
//   · 新建专家 / 添加连接 / 导入三个入口各自的按钮文案
//   · 搭档模式的详情停靠栏（整窗截，没有稳定选择器）
import { W, IN_DEMO, SWITCH_TO_DEMO, NO_SPELLCHECK } from "./demo-ws.mjs";
import { CLOSE_CHECKLIST, CLICK_TEXT, OPEN_SETTINGS, CLEAN_UI } from "./ui.mjs";

/** 按选择器点（默认第一个命中；last=true 取最后一个） */
const CLICK_SEL = (sel, last = false) => `(() => {
  const els = Array.from(document.querySelectorAll(${JSON.stringify(sel)}));
  if (!els.length) return 'NOT FOUND: ' + ${JSON.stringify(sel)};
  const el = ${last ? "els[els.length - 1]" : "els[0]"};
  el.scrollIntoView({ block: 'center' });
  el.click();
  return 'ok';
})()`;

const HAS = (sel) => `!!document.querySelector(${JSON.stringify(sel)})`;

/** 设置左栏分类：源码里每个分类按钮都带 data-tour="settings-cat-<id>"（Settings.tsx:8169） */
const CAT = (id) => CLICK_SEL(`[data-tour="settings-cat-${id}"]`);

/** 「扩展管理」页里的四个页签：技能 / 连接器（MCP）/ 专家（智能体）/ 插件（Settings.tsx:1253） */
const EXT_TAB = (label) => `(() => {
  const el = Array.from(document.querySelectorAll('[role="tablist"] button'))
    .find((b) => (b.innerText || "").trim() === ${JSON.stringify(label)});
  if (!el) return 'NOT FOUND TAB: ' + ${JSON.stringify(label)};
  el.click();
  return 'ok';
})()`;

/** 服务商添加弹窗（data-tour="tour-settings-provider-dialog"）+ 弹窗内的按钮 */
const DIALOG = '[data-tour="tour-settings-provider-dialog"]';
const DIALOG_BTN = (label) => `(() => {
  const dlg = document.querySelector(${JSON.stringify(DIALOG)});
  if (!dlg) return 'NO DIALOG';
  const el = Array.from(dlg.querySelectorAll('button'))
    .find((b) => (b.innerText || "").trim() === ${JSON.stringify(label)});
  if (!el) return 'NOT FOUND BTN: ' + ${JSON.stringify(label)};
  el.click();
  return 'ok';
})()`;

/**
 * 往 composer 里打字。composer 是 Slate（SidebarInput.tsx 用 <Slate>/<Editable>），
 * 直接改 DOM 会被 Slate 的模型覆盖掉，所以走 beforeinput + insertText 两条路
 * （execCommand 那条对 Slate 常年不生效，留着当兜底）。待验。
 */
const TYPE_INTO_COMPOSER = (text) => `(() => {
  const el = document.querySelector('[data-sidebar-composer="true"] [contenteditable="true"]');
  if (!el) return 'NO EDITABLE';
  el.focus();
  const ok = document.execCommand('insertText', false, ${JSON.stringify(text)});
  if (ok) return 'execCommand';
  el.dispatchEvent(new InputEvent('beforeinput', {
    inputType: 'insertText', data: ${JSON.stringify(text)}, bubbles: true, cancelable: true,
  }));
  return 'beforeinput';
})()`;

// chat-diff 要真跑一次「让 AI 改文件」，默认不跑（会花你的 token，且依赖当前模型听话）。
const WITH_AI = process.env.MEMBER_AI === "1";

// 跑之前先把可能的残留清掉：上一批可能停在设置面板 / 弹窗 / 浮层上。
const RESET = [
  { name: "关掉添加弹窗", eval: DIALOG_BTN("取消"), after: 700 },
  { name: "收掉浮层", key: "Escape" },
  { wait: 400 },
];

export default {
  steps: [
    SWITCH_TO_DEMO,
    { name: "工作区就绪", waitFor: IN_DEMO, timeout: 40000 },
    ...RESET,
    ...CLEAN_UI,
    CLOSE_CHECKLIST,
    NO_SPELLCHECK,

    // ─────────────────────────────────────────────────────────────
    // 一、设置页（5 张）
    // ─────────────────────────────────────────────────────────────
    OPEN_SETTINGS,
    { name: "设置已开", waitFor: HAS("nav.overflow-y-auto"), timeout: 8000 },

    { name: "点分类 AI", eval: CAT("ai"), after: 1200 },
    { name: "settings-ai", shot: "guide/settings-ai", size: W, wait: 700 },

    // 扩展管理 = 技能 / 连接器（MCP）/ 专家（智能体）/ 插件 四个页签
    { name: "点分类 扩展管理", eval: CAT("extensions"), after: 1200 },
    { name: "切到技能页签", eval: EXT_TAB("技能"), after: 1400 },
    { name: "settings-skills", shot: "guide/settings-skills", size: W, wait: 700 },
    { name: "切到连接器页签", eval: EXT_TAB("连接器（MCP）"), after: 1400 },
    { name: "settings-mcp", shot: "guide/settings-mcp", size: W, wait: 700 },
    // 连接器卡片：页签内的一张卡（含可用工具 / 启用开关 / 测试徽标三件套）。
    // 待验：装的连接器如果全是折叠态，这里拍到的会是一列折叠行而不是展开的卡。
    { name: "mcp-card", shot: "guide/mcp-card", size: W, clip: [300, 150, 900, 500], wait: 500 },
    // 导入：连接器页的「导入」按钮 → 贴 JSON 的框
    { name: "点导入", eval: `(() => {
      const el = Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || "").trim() === '导入配置' || (b.innerText || "").trim() === '导入');
      if (!el) return 'NOT FOUND 导入';
      el.click();
      return 'ok';
    })()`, after: 1000 },
    { name: "mcp-import", shot: "guide/mcp-import", size: W, wait: 600 },
    { name: "关掉导入", key: "Escape" },

    { name: "切到专家页签", eval: EXT_TAB("专家（智能体）"), after: 1400 },
    { name: "settings-agents", shot: "guide/settings-agents", size: W, wait: 700 },
    // 新建专家：专家页的新建入口 → 角色/技能/连接器/高级设置那张表单
    // 待验：入口文案（「新建专家」/「创建专家」/一个 ＋ 图标）按实际改。
    { name: "点新建专家", eval: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const el = btns.find((b) => /新建专家|创建专家|新建/.test((b.innerText || "").trim()));
      if (!el) return 'NOT FOUND 新建';
      el.click();
      return 'ok: ' + (el.innerText || '').trim();
    })()`, after: 1400 },
    { name: "agents-new", shot: "guide/agents-new", size: W, wait: 800 },
    { name: "退出新建", key: "Escape" },
    { wait: 500 },

    { name: "点分类 远程助手", eval: CAT("gateway"), after: 1400 },
    { name: "settings-gateway", shot: "guide/settings-gateway", size: W, wait: 700 },
    // 添加连接：远程助手页里挑一个平台 → 只会问那个平台真正需要的字段
    // 待验：这一步可能弹二级表单而不是页内展开，按实际改。
    { name: "点添加连接", eval: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const el = btns.find((b) => /添加连接|添加机器人|连接/.test((b.innerText || "").trim()) && (b.innerText || "").trim().length < 12);
      if (!el) return 'NOT FOUND 添加连接';
      el.click();
      return 'ok: ' + (el.innerText || '').trim();
    })()`, after: 1400 },
    { name: "gateway-add-bot", shot: "guide/gateway-add-bot", size: W, wait: 800 },
    { name: "退出连接表单", key: "Escape" },
    { wait: 500 },

    // ─────────────────────────────────────────────────────────────
    // 二、服务商三步向导（3 张）
    // ─────────────────────────────────────────────────────────────
    { name: "点分类 AI", eval: CAT("ai"), after: 1200 },
    // 已经有服务商时页头是「添加」，一个都没有时是空态卡里的「开始配置」——
    // 两处共用同一个 data-tour（Settings.tsx:10008 / 10045），取最后一个 = 页头那个。
    { name: "开添加弹窗", eval: CLICK_SEL('[data-tour="tour-settings-add-provider"]', true), after: 1200 },
    { name: "弹窗已开", waitFor: HAS(DIALOG), timeout: 8000 },
    { name: "ai-add-provider", shot: "guide/ai-add-provider", size: W, wait: 700 },
    // ① 选服务商：同一屏，但只框弹窗本体（去掉背后的蒙层），和上一张区分开
    { name: "ai-provider-picker", shot: "guide/ai-provider-picker", size: W, sel: DIALOG, wait: 500 },
    // ② 填密钥 + 挑模型：挑「OpenAI」进第二步。**不填任何密钥**——
    // 这一步的图只展示表单长什么样，需要「测试通过后拉回模型列表」的画面时再单独补。
    { name: "选 OpenAI", eval: `(() => {
      const dlg = document.querySelector(${JSON.stringify(DIALOG)});
      if (!dlg) return 'NO DIALOG';
      const el = Array.from(dlg.querySelectorAll('button'))
        .find((b) => (b.innerText || "").includes('OpenAI'));
      if (!el) return 'NOT FOUND OpenAI';
      el.click();
      return 'ok';
    })()`, after: 1400 },
    { name: "ai-provider-key", shot: "guide/ai-provider-key", size: W, sel: DIALOG, wait: 700 },
    { name: "关掉添加弹窗", eval: DIALOG_BTN("取消"), after: 900 },
    ...CLEAN_UI,

    // ─────────────────────────────────────────────────────────────
    // 三、对话（10 张）
    // ─────────────────────────────────────────────────────────────
    { name: "回到工作台", waitFor: HAS('[data-sidebar-composer="true"]'), timeout: 15000 },
    { name: "chat-panel", shot: "guide/chat-panel", size: W, wait: 800 },
    { name: "chat-input", shot: "guide/chat-input", size: W, sel: '[data-sidebar-composer="true"]', wait: 400 },

    // @ 引用面板：往 composer 里打一个 @（待验，见 TYPE_INTO_COMPOSER）
    { name: "打 @", eval: TYPE_INTO_COMPOSER("@"), after: 1200 },
    { name: "mention-panel", shot: "guide/mention-panel", size: W, wait: 600 },
    // 技能 chip：切到「技能」页签挑一个，chip 会插到光标处
    { name: "切技能页签", eval: `(() => {
      const el = Array.from(document.querySelectorAll('[role="tablist"][aria-label="引用分类"] button'))
        .find((b) => (b.getAttribute('aria-label') || '').startsWith('技能'));
      if (!el) return 'NO SKILL TAB';
      el.click();
      return 'ok';
    })()`, after: 900 },
    { name: "选第一个技能", eval: `(() => {
      const panel = document.querySelector('[role="tablist"][aria-label="引用分类"]');
      const host = panel ? panel.closest('div[class]')?.parentElement : null;
      const scope = host || document;
      const el = Array.from(scope.querySelectorAll('[role="option"], li button, button'))
        .find((b) => (b.innerText || "").trim().length > 1 && !/技能|文件|专家|连接器/.test((b.innerText || "").trim()));
      if (!el) return 'NOT FOUND skill item';
      el.click();
      return 'ok: ' + (el.innerText || '').trim().slice(0, 20);
    })()`, after: 1000 },
    { name: "chat-skill-chip", shot: "guide/chat-skill-chip", size: W, sel: '[data-sidebar-composer="true"]', wait: 600 },
    { name: "清掉 @ 查询", key: "Escape" },
    { wait: 400 },

    // 模型选择器 = 控件条第一格（Sidebar.tsx:19213「provider」/ 顺序即展示顺序）
    { name: "开模型下拉", eval: CLICK_SEL('.composer-toolbar-item'), after: 1200 },
    { name: "model-selector", shot: "guide/model-selector", size: W, wait: 700 },
    // 推理等级并进了模型下拉（Sidebar.tsx:19206 注释），所以同一屏往下滚就是它。
    // 待验：当前模型不支持思考时，这一屏没有「推理等级」这一行。
    { name: "model-reasoning", shot: "guide/model-reasoning", size: W, wait: 400 },
    { name: "收起下拉", key: "Escape" },
    { wait: 500 },

    // AI 补全：编辑器工具栏的「⊞」= 百宝箱，里面那行就是 AI 补全开关
    // （EditorToolbar.tsx:145 的 title="工具栏模式设置"、:224 的 AI 补全开关）
    { name: "开百宝箱", eval: CLICK_SEL('button[title="工具栏模式设置"]'), after: 1000 },
    { name: "editor-autocomplete", shot: "guide/editor-autocomplete", size: W, wait: 600 },
    { name: "收起百宝箱", key: "Escape" },
    { wait: 400 },

    // 搭档模式：整屏对话 + 右侧详情停靠栏（时间线 / 改动）
    { name: "切搭档模式", eval: CLICK_TEXT("搭档", ".activity-bar button"), after: 2500 },

    ...(WITH_AI
      ? [
          {
            name: "让 AI 改一个文件",
            eval: TYPE_INTO_COMPOSER("在 我的笔记/ 下新建一个 hello.md，内容写：你好，这是 Notrat 的测试文件。"),
            after: 800,
          },
          { name: "发送", eval: CLICK_SEL('[data-tour="tour-sidebar-send-button"]'), after: 1000 },
          { name: "等它写完", waitFor: HAS('[class*="diff"]'), timeout: 120000 },
          { name: "chat-diff", shot: "guide/chat-diff", size: W, wait: 600 },
        ]
      : []),

    { name: "partner-mode", shot: "guide/partner-mode", size: W, wait: 800 },
    // 详情停靠栏没有稳定选择器，整窗截（右侧那条就是它）
    { name: "details-dock", shot: "guide/details-dock", size: W, wait: 400 },
  ],
};
