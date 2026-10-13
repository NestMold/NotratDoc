// 第 M 批：会员功能页（22 张）——对应 tools/placeholder-shots.py 里的 MISSING 清单。
//
// 前置条件（缺一不可）：
//   1. 测试实例（%APPDATA%\notrat-test）**已登录**，档位 ≥ 基础版；
//   2. 「设置 → AI」里至少接了一个服务商（首屏截图会露出服务商列表，跑完记得查隐私）；
//   3. 应用在跑、CDP 端口开着、主进程 --inspect=9230 开着（跑法见 capture-run.mjs 头部）。
//
// 跑法：
//   node tools/capture-run.mjs "G:/front_project/docs/tools/steps-m-member.mjs"
//   只补某几张：加 --only chat- / --only settings- / --only ai- （前缀匹配）
//   连 chat-diff（要真跑一次 AI 改文件）一起拍：MEMBER_AI=1 node tools/capture-run.mjs ...
//
// ── 2026-10-13 第二轮：按实跑日志修过的几处 ──────────────────────────────
//   · 设置面板的「已开」判据换成 [data-tour="settings-panel-root"]（nav.overflow-y-auto 会误命中别处）
//   · **Escape 会直接关掉整个设置面板**（第一轮 24/26/30/32 全挂的根因）——所以每步之前都先
//     自查面板在不在，不在就点开，见 GO_CAT；
//   · `@` 面板必须走**真实按键**（{ type: "@" }）：Slate 对 execCommand/insertText 不理，
//     第一轮 composer 里只剩一个孤零零的 @；
//   · 按钮文案按实拍改：「创建专家」（不是新建专家）、「连接新账号」（不是添加连接）。
import { W, IN_DEMO, SWITCH_TO_DEMO, NO_SPELLCHECK } from "./demo-ws.mjs";
import { CLOSE_CHECKLIST, CLICK_TEXT, CLEAN_UI } from "./ui.mjs";

const HAS = (sel) => `!!document.querySelector(${JSON.stringify(sel)})`;
const PANEL = '[data-tour="settings-panel-root"]';
const DIALOG = '[data-tour="tour-settings-provider-dialog"]';

/** 点第 n 个命中（默认第一个） */
const CLICK_SEL = (sel, last = false) => `(() => {
  const els = Array.from(document.querySelectorAll(${JSON.stringify(sel)}));
  if (!els.length) return 'NOT FOUND: ' + ${JSON.stringify(sel)};
  const el = ${last ? "els[els.length - 1]" : "els[0]"};
  el.scrollIntoView({ block: 'center' });
  el.click();
  return 'ok';
})()`;

/** 在某个 scope 里按「文字相等」点按钮（scope 缺省 = 全文档，取最后一个命中） */
const CLICK_BTN = (label, scope, startsWith = false) => `(() => {
  const root = ${scope ? `document.querySelector(${JSON.stringify(scope)})` : "document"};
  if (!root) return 'NO SCOPE: ' + ${JSON.stringify(scope)};
  const want = ${JSON.stringify(label)};
  const el = Array.from(root.querySelectorAll('button'))
    .find((b) => {
      const t = (b.innerText || '').trim();
      return ${startsWith ? "t.startsWith(want)" : "t === want"};
    });
  if (!el) return 'NOT FOUND BTN: ' + want;
  el.scrollIntoView({ block: 'center' });
  el.click();
  return 'ok: ' + (el.innerText || '').trim().slice(0, 20);
})()`;

/**
 * 打开设置 → 切到某个分类 → **自查确实切过去了**（面板还在 ⇒ 才返回 ok）。
 * 一次不成会重试：上一张图可能被 Escape 顺手关掉了整个面板。
 */
const GO_CAT = (id, label) => ({
  name: `设置 → ${label}`,
  eval: `(async () => {
    const nap = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 4; i++) {
      if (!document.querySelector(${JSON.stringify(PANEL)})) {
        const s = Array.from(document.querySelectorAll('button, div, span'))
          .filter((x) => (x.innerText || '').trim() === '设置').pop();
        if (s) s.click();
        await nap(1500);
      }
      const cat = document.querySelector('[data-tour="settings-cat-${id}"]');
      if (cat && document.querySelector(${JSON.stringify(PANEL)})) {
        cat.click();
        await nap(1100);
        return 'ok';
      }
      await nap(700);
    }
    return 'FAILED: 面板没打开或分类 ' + ${JSON.stringify(id)} + ' 不存在';
  })()`,
  after: 500,
});

/** 关掉整个设置面板（点面板右上角那个 ✕；它是头部第二个按钮） */
const CLOSE_SETTINGS = {
  name: "关掉设置面板",
  eval: `(() => {
    const p = document.querySelector(${JSON.stringify(PANEL)});
    if (!p) return 'not-open';
    const right = p.getBoundingClientRect().right;
    const x = Array.from(p.querySelectorAll('button'))
      .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.y < 200 && r.right > right - 90; })
      .pop();
    if (!x) return 'NO CLOSE BTN';
    x.click();
    return 'closed';
  })()`,
  after: 900,
};

/** 「扩展管理」四个页签：技能 / 连接器（MCP）/ 专家（智能体）/ 插件（实拍确认是 button[role=tab]） */
const EXT_TAB = (label) => `(() => {
  const el = Array.from(document.querySelectorAll('[role="tab"]'))
    .find((b) => (b.innerText || '').trim() === ${JSON.stringify(label)});
  if (!el) return 'NOT FOUND TAB: ' + ${JSON.stringify(label)};
  el.click();
  return 'ok';
})()`;

/** 跑完在日志里留一行「这一步屏幕上是什么」，省得事后一张张查图 */
const PEEK = (what) => ({
  name: `peek ${what}`,
  eval: `(() => {
    const p = document.querySelector(${JSON.stringify(PANEL)});
    if (!p) return 'NO PANEL';
    const tab = Array.from(p.querySelectorAll('[role="tab"]')).find((b) => b.getAttribute('aria-selected') === 'true');
    const h = p.querySelector('h2, h3');
    return [tab ? 'tab=' + (tab.innerText || '').trim() : '', h ? 'h=' + (h.innerText || '').trim().slice(0, 20) : '', (p.innerText || '').replace(/\\s+/g, ' ').slice(0, 50)].filter(Boolean).join(' | ');
  })()`,
});

/**
 * 「AI 服务商」卡片会把 baseUrl 和模型名明晃晃印在图上。测试实例里那条是**用户自己的中转
 * 服务商**，不该出现在公开文档里——拍之前换成官方地址 + 通用模型名，拍完立刻还原。
 * 只动 baseUrl / model 两个字段：apiKey 一个字不碰，原值先存 sessionStorage（不进仓库）。
 */
const NEUTRALIZE_PROVIDERS = {
  name: "临时中立化服务商 baseUrl",
  eval: `(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem('notrat-ai-config') || '{}');
      const list = cfg.providers || [];
      // 只处理「填过密钥」的——那才是用户真实的私有配置，内置的都是官方地址
      const hit = list.filter((p) => p.apiKey && p.baseUrl);
      if (!hit.length) return 'nothing-to-do';
      sessionStorage.setItem('notrat-shot-restore', JSON.stringify(hit.map((p) => ({ id: p.id, baseUrl: p.baseUrl, model: p.model }))));
      for (const p of hit) {
        if (p.type === 'anthropic') { p.baseUrl = 'https://api.anthropic.com'; p.model = 'claude-sonnet-5'; }
        else { p.baseUrl = 'https://api.openai.com/v1'; p.model = 'gpt-4o'; }
      }
      localStorage.setItem('notrat-ai-config', JSON.stringify(cfg));
      return 'neutralized ' + hit.length;
    } catch (e) { return 'ERR ' + e.message; }
  })()`,
  after: 500,
};

/** 还原 baseUrl / model（整批跑完执行；中途挂了就手动补一次） */
const RESTORE_PROVIDERS = {
  name: "还原服务商 baseUrl",
  eval: `(() => {
    try {
      const raw = sessionStorage.getItem('notrat-shot-restore');
      if (!raw) return 'nothing-to-restore';
      const saved = JSON.parse(raw);
      const cfg = JSON.parse(localStorage.getItem('notrat-ai-config') || '{}');
      for (const s of saved) {
        const p = (cfg.providers || []).find((x) => x.id === s.id);
        if (p) { p.baseUrl = s.baseUrl; if (s.model) p.model = s.model; }
      }
      localStorage.setItem('notrat-ai-config', JSON.stringify(cfg));
      sessionStorage.removeItem('notrat-shot-restore');
      return 'restored ' + saved.length;
    } catch (e) { return 'ERR ' + e.message; }
  })()`,
  after: 400,
};

const WITH_AI = process.env.MEMBER_AI === "1";

export default {
  steps: [
    // 上一批/上一次手工调试可能停在弹窗上，先按掉（弹窗开着时后面点什么都点不动）
    { name: "先收浮层", key: "Escape", after: 500 },
    SWITCH_TO_DEMO,
    { name: "工作区就绪", waitFor: IN_DEMO, timeout: 40000 },

    // 对话侧栏默认 320px，截出来的图在文档里太窄——加宽到 460（这是用户能拖到的正常宽度）
    // 并整页重载一次，让 React 的 sidebarWidth state 也读到新值，而不是只靠 CSS 变量硬顶。
    { name: "侧栏宽度=460", eval: `(() => { try { localStorage.setItem('notrat-sidebar-width', '460'); return 'set'; } catch (e) { return 'ERR ' + e.message; } })()` },
    { name: "整页重载", eval: `location.reload()`, after: 3000 },
    { name: "等应用回来", waitFor: HAS('[data-sidebar-composer="true"]'), timeout: 60000 },
    { name: "等演示工作区", waitFor: IN_DEMO, timeout: 40000 },
    // 上一批跑完可能停在搭档模式（整屏对话），那 chat-panel 就会拍成搭档模式——
    // 前面的对话图全在工作台拍，这里先确保切回工作台（本来就在的话点了也没事）
    { name: "确保在工作台", eval: `(() => {
      const b = Array.from(document.querySelectorAll('.activity-bar button')).find((x) => (x.innerText || '').trim() === '工作台');
      if (!b) return 'NO 工作台 BTN';
      b.click();
      return 'ok';
    })()`, after: 1600 },

    CLOSE_CHECKLIST,
    NO_SPELLCHECK,
    // 上一轮可能留了个 @ 在输入框里（也顺手把光标从别处收回来）
    { name: "清空输入框", mouse: true, sel: '[data-sidebar-composer="true"] [contenteditable="true"]', after: 400 },
    { name: "全选", key: "a", ctrl: true, after: 200 },
    { name: "删掉", key: "Delete", after: 400 },

    // ─────────────────────────────────────────────────────────────
    // 一、设置 → AI（1 + 3 张）
    // ─────────────────────────────────────────────────────────────
    NEUTRALIZE_PROVIDERS,
    GO_CAT("ai", "AI"),
    PEEK("settings-ai"),
    { name: "settings-ai", shot: "guide/settings-ai", size: W, wait: 700 },

    // 服务商三步向导：① 选服务商（入口在哪 + 只有弹窗）② 填密钥/挑模型
    // 页头「添加」带 data-tour="tour-settings-add-provider"，实测全页只有这一个（y≈216）。
    // ai-add-provider 拍的是**点击之前**：「AI 服务商」那一段卡片（标题 + 说明 + 导入/＋添加
    // 两个入口 + 已配好的那张卡）。原先它和下面的 picker 是同一屏弹窗，两张图重复。
    { name: "ai-add-provider", shot: "guide/ai-add-provider", size: W, clip: [400, 205, 890, 140], wait: 600 },
    { name: "开添加弹窗", eval: CLICK_SEL('[data-tour="tour-settings-add-provider"]'), after: 1300 },
    { name: "弹窗已开", waitFor: HAS(DIALOG), timeout: 8000 },
    { name: "ai-provider-picker", shot: "guide/ai-provider-picker", size: W, sel: DIALOG, wait: 500 },
    // ② 挑「OpenAI」进第二步。**不填任何密钥**——这张图只展示表单长什么样。
    { name: "选 OpenAI", eval: CLICK_BTN("OpenAI", DIALOG, true), after: 1400 },
    { name: "ai-provider-key", shot: "guide/ai-provider-key", size: W, sel: DIALOG, wait: 700 },
    { name: "关掉添加弹窗", eval: CLICK_BTN("取消", DIALOG), after: 1000 },

    // ─────────────────────────────────────────────────────────────
    // 二、设置 → 扩展管理：技能 / 连接器（MCP）/ 专家（智能体）（5 张）
    // ─────────────────────────────────────────────────────────────
    GO_CAT("extensions", "扩展管理"),
    { name: "切到技能页签", eval: EXT_TAB("技能"), after: 1400 },
    PEEK("settings-skills"),
    { name: "settings-skills", shot: "guide/settings-skills", size: W, wait: 700 },

    { name: "切到连接器页签", eval: EXT_TAB("连接器（MCP）"), after: 1500 },
    PEEK("settings-mcp"),
    { name: "settings-mcp", shot: "guide/settings-mcp", size: W, wait: 700 },
    // 连接器卡片：页内一张卡（含可用工具 / 启用开关 / 测试徽标三件套）。
    // 用坐标裁而不是选择器——卡片本身没有稳定的 data-tour。
    { name: "mcp-card", shot: "guide/mcp-card", size: W, clip: [300, 150, 900, 520], wait: 500 },
    // 导入：连接器页的「导入」按钮 → 贴 JSON 的框
    { name: "点导入", eval: CLICK_BTN("导入", PANEL), after: 1200 },
    { name: "mcp-import", shot: "guide/mcp-import", size: W, wait: 600 },
    { name: "关掉导入", key: "Escape", after: 300 },
    // ↑ 这个 Escape 会顺手把**整个设置面板**关掉，所以下面必须重新走一遍 GO_CAT
    GO_CAT("extensions", "扩展管理"),

    { name: "切到专家页签", eval: EXT_TAB("专家（智能体）"), after: 1500 },
    PEEK("settings-agents"),
    { name: "settings-agents", shot: "guide/settings-agents", size: W, wait: 700 },
    // 新建专家：实拍文案是「**创建**专家」（页面右上角，旁边还有「检测更新」）
    { name: "点创建专家", eval: CLICK_BTN("创建专家", PANEL), after: 1500 },
    { name: "agents-new", shot: "guide/agents-new", size: W, wait: 800 },
    { name: "退出新建", key: "Escape", after: 300 },

    // ─────────────────────────────────────────────────────────────
    // 三、设置 → 远程助手（2 张）
    // ─────────────────────────────────────────────────────────────
    GO_CAT("gateway", "远程助手"),
    PEEK("settings-gateway"),
    { name: "settings-gateway", shot: "guide/settings-gateway", size: W, wait: 700 },
    // 添加连接：实拍文案是「连接新账号」→ 弹平台选择器（不会提交任何凭据，拍完取消掉）
    { name: "点连接新账号", eval: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const el = btns.find((b) => /连接新账号|扫码连接/.test((b.innerText || '').trim()));
      if (!el) return 'NOT FOUND 连接新账号';
      el.click();
      return 'ok: ' + (el.innerText || '').trim();
    })()`, after: 1500 },
    { name: "gateway-add-bot", shot: "guide/gateway-add-bot", size: W, wait: 800 },
    { name: "退出连接表单", key: "Escape", after: 400 },

    ...CLEAN_UI,
    { name: "设置已关", waitFor: `!document.querySelector(${JSON.stringify(PANEL)})`, timeout: 8000 },

    // ─────────────────────────────────────────────────────────────
    // 四、对话（8 张）
    // ─────────────────────────────────────────────────────────────
    { name: "回到工作台", waitFor: HAS('[data-sidebar-composer="true"]'), timeout: 15000 },
    PEEK("chat-panel"),
    { name: "chat-panel", shot: "guide/chat-panel", size: W, wait: 900 },
    { name: "chat-input", shot: "guide/chat-input", size: W, sel: '[data-sidebar-composer="true"]', wait: 400 },

    // `@` 引用面板：**必须真实按键**——Slate 只认 keydown/char，
    // execCommand('insertText') 和 CDP 的 Input.insertText 都只塞字符、不触发面板。
    { name: "点输入框", mouse: true, sel: '[data-sidebar-composer="true"] [contenteditable="true"]', after: 400 },
    { name: "打 @", type: "@", delay: 200, after: 1400 },
    { name: "mention-panel", shot: "guide/mention-panel", size: W, wait: 600 },
    // 技能 chip：面板里切到「技能」页签挑第一个，chip 插到光标处
    // 面板里的页签是「技能 69」这种带计数的，按前缀匹配；
    // 锚点用「它的兄弟页签也在同一行」判据，不靠坐标——面板高度会随内容变，
    // 切完页签整块会上移（第一版写死 y>400 就栽在这）。
    { name: "切技能页签", eval: `(() => {
      const t = Array.from(document.querySelectorAll('button')).find((x) => {
        if (!/^技能/.test((x.innerText || '').trim())) return false;
        const row = (x.parentElement || {}).innerText || '';
        return row.includes('文件') && row.includes('连接器');
      });
      if (!t) return 'NO SKILL TAB';
      t.click();
      return 'ok: ' + (t.innerText || '').trim().replace(/\\s+/g, ' ');
    })()`, after: 1200 },
    { name: "选第一个技能", eval: `(() => {
      const tab = Array.from(document.querySelectorAll('button')).find((x) => {
        if (!/^技能/.test((x.innerText || '').trim())) return false;
        const row = (x.parentElement || {}).innerText || '';
        return row.includes('文件') && row.includes('连接器');
      });
      if (!tab) return 'NO SKILL TAB';
      // 从页签往上爬到面板根（它里面有「选择目标」这行标题）
      let host = tab;
      for (let i = 0; i < 8 && host.parentElement; i++) {
        host = host.parentElement;
        if ((host.innerText || '').includes('选择目标')) break;
      }
      const y0 = tab.getBoundingClientRect().bottom;
      const cand = Array.from(host.querySelectorAll('[role="option"], [cmdk-item], li, button, [role="listitem"], div[tabindex]'))
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.y >= y0 - 2 && r.height > 24 && r.width > 150 && (e.innerText || '').trim().length > 1;
        })
        .sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
      if (!cand.length) return 'NO SKILL ITEM';
      cand[0].click();
      return 'ok: ' + (cand[0].innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 24);
    })()`, after: 1200 },
    { name: "chat-skill-chip", shot: "guide/chat-skill-chip", size: W, sel: '[data-sidebar-composer="true"]', wait: 600 },
    { name: "收起面板", key: "Escape", after: 400 },
    // 清掉输入框里的技能 chip：Delete 对 Slate 里的行内 chip 不生效（会残留在后续每一张图里），
    // 全选 + 退格才真的删得掉
    { name: "点输入框", mouse: true, sel: '[data-sidebar-composer="true"] [contenteditable="true"]', after: 300 },
    { name: "全选", key: "a", ctrl: true, after: 200 },
    { name: "退格删掉", key: "Backspace", after: 400 },

    // 模型选择器 = 控件条第一格（Sidebar.tsx:19213 的 toolbarItems 顺序，key "provider"）
    { name: "开模型下拉", eval: CLICK_SEL('.composer-toolbar-item'), after: 1300 },
    // 下拉默认是折叠的「服务商分组」，点开那一行才看得到模型清单
    { name: "展开服务商分组", eval: `(() => {
      const hit = Array.from(document.querySelectorAll('*'))
        .filter((e) => {
          const r = e.getBoundingClientRect();
          const t = (e.innerText || '').trim();
          return /anthropic|Claude Code/i.test(t) && t.length < 40 && r.width > 150 && r.width < 700 && r.height > 18 && r.height < 60;
        })
        .sort((a, b) => (a.innerText || '').length - (b.innerText || '').length)[0];
      if (!hit) return 'NO PROVIDER ROW';
      (hit.closest('button, [role="button"], [role="option"], [role="menuitem"], div[tabindex]') || hit).click();
      return 'ok';
    })()`, after: 1200 },
    { name: "model-selector", shot: "guide/model-selector", size: W, wait: 700 },
    { name: "收起下拉", key: "Escape", after: 500 },

    // AI 补全：编辑器工具栏的「⊞」= 百宝箱，里面那行就是 AI 补全开关
    { name: "开百宝箱", eval: CLICK_SEL('button[title="工具栏模式设置"]'), after: 1100 },
    { name: "editor-autocomplete", shot: "guide/editor-autocomplete", size: W, wait: 600 },
    { name: "收起百宝箱", key: "Escape", after: 400 },

    // 搭档模式：整屏对话 + 右侧详情停靠栏（时间线 / 改动）
    { name: "切搭档模式", eval: CLICK_TEXT("搭档", ".activity-bar button"), after: 2500 },

    ...(WITH_AI
      ? [
          { name: "点搭档输入框", mouse: true, sel: '[data-sidebar-composer="true"] [contenteditable="true"]', after: 500 },
          { name: "让 AI 改一个文件", type: "在 我的笔记/ 下新建一个 hello.md，内容写：你好，这是 Notrat 的测试文件。", delay: 25, after: 800 },
          { name: "发送", eval: CLICK_SEL('[data-tour="tour-sidebar-send-button"]'), after: 1000 },
          { name: "等它写完", waitFor: `!!document.querySelector('[class*="diff"], [data-diff]')`, timeout: 180000 },
          { name: "chat-diff", shot: "guide/chat-diff", size: W, wait: 600 },
        ]
      : []),

    { name: "partner-mode", shot: "guide/partner-mode", size: W, wait: 1000 },
    // 推理等级：**搭档模式**下工具条够宽，「思考」这一格才露出来（工作台那栏太窄，
    // 被收进溢出菜单了）；它的下拉点不出来（真实鼠标点也弹不开，是个 0 尺寸的悬浮件），
    // 所以这张就拍工具条本身——docs 里那句话是「支持思考的模型会多出一个推理等级
    // （或「思考」开关）」，拍的正是这个开关。
    // 注意选择器：搭档模式的输入框是 [data-immersive-composer]，而 [data-sidebar-composer="true"]
    // 在这里会先命中工作台那个**隐藏的** 0 尺寸件（querySelector 只取第一个），裁出来是整窗。
    { name: "model-reasoning", shot: "guide/model-reasoning", size: W, sel: "[data-immersive-composer]", wait: 600 },
    // 详情停靠栏没有稳定选择器，裁右侧一条（负坐标 = 从右边量，见 capture-run.mjs 的 clip 处理）
    { name: "details-dock", shot: "guide/details-dock", size: W, clip: [-430, 56, 430, 800], wait: 400 },

    // 最后一步：把服务商 baseUrl 还原回去
    RESTORE_PROVIDERS,
  ],
};
