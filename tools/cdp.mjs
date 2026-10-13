// CDP 驱动 Notrat 应用（截图 / 交互）。
// 零依赖（Node 21+ 全局 fetch/WebSocket）。基于 Notrat 仓库 scripts/cdp-shot.mjs，
// 差异：BASE 端口可用 CDP_BASE 覆盖；新增 clicktext / shotsel / wait / targets。
//
// 目标实例（不动用户正在跑的开发实例）：
//   cd G:/front_project/Notrat
//   NOTRAT_TEST_INSTANCE=1 CDP_PORT=9223 npx electron .
//
// 用法：
//   node tools/cdp.mjs targets
//   node tools/cdp.mjs shot <输出.png> [WxH|keep]
//   node tools/cdp.mjs shotsel "<选择器>" <输出.png>
//   node tools/cdp.mjs eval "<js 表达式>"
//   node tools/cdp.mjs state
//   node tools/cdp.mjs click "<选择器>"
//   node tools/cdp.mjs clicktext "<可见文字>" [标签名]
//   node tools/cdp.mjs wait <毫秒>
const BASE = `http://127.0.0.1:${process.env.CDP_BASE || 9222}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const list = await (await fetch(`${BASE}/json/list`)).json();
      const page =
        (process.env.CDP_TARGET && list.find((t) => t.id.startsWith(process.env.CDP_TARGET))) ||
        list.find((t) => t.type === "page" && !t.url.includes("devtools"));
      if (!page) throw new Error("no page target");
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((res, rej) => {
        ws.onopen = res;
        ws.onerror = () => rej(new Error("ws error"));
      });
      return { ws, page };
    } catch {
      await sleep(2000);
    }
  }
  throw new Error("CDP not reachable at " + BASE);
}

function makeRpc(ws) {
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  };
  return (method, params = {}, timeoutMs = 30000) =>
    new Promise((res, rej) => {
      const i = ++id;
      const t = setTimeout(() => rej(new Error(`timeout: ${method}`)), timeoutMs);
      pending.set(i, (m) => {
        clearTimeout(t);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
      });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
}

const evalInPage = async (rpc, expression) => {
  const r = await rpc("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails)
    throw new Error(
      "page exception: " +
        JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails).slice(0, 500)
    );
  return r.result.value;
};

// 按可见文字找元素并点击（探针式：只在叶子元素里找精确/包含匹配）
const CLICK_TEXT_HELPER = `
(() => {
  const args = __ARGS__;
  const norm = (s) => (s || "").replace(/\\s+/g, " ").trim();
  const wanted = norm(args.text);
  const tagFilter = args.tag ? args.tag.toUpperCase() : null;
  const all = Array.from(document.querySelectorAll(tagFilter || "*"));
  const cands = all.filter((el) => {
    if (tagFilter && el.tagName !== tagFilter) return false;
    const own = norm(Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join(" "));
    const full = norm(el.innerText);
    return own === wanted || full === wanted;
  });
  const exact = cands.filter(el => norm(el.innerText) === wanted);
  const pool = exact.length ? exact : cands;
  // 取最深的（叶子优先）
  pool.sort((a, b) => (b.compareDocumentPosition(a) & 8 ? 1 : -1));
  const el = pool[pool.length - 1] || all.find(el => norm(el.innerText) === wanted);
  if (!el) return { ok: false, reason: "not found", candidates: pool.length };
  el.scrollIntoView({ block: "center" });
  const r = el.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, view: window };
  el.dispatchEvent(new PointerEvent("pointerover", opts));
  el.dispatchEvent(new MouseEvent("mouseover", opts));
  el.dispatchEvent(new PointerEvent("pointerdown", opts));
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  el.dispatchEvent(new PointerEvent("pointerup", opts));
  el.dispatchEvent(new MouseEvent("mouseup", opts));
  el.dispatchEvent(new MouseEvent("click", opts));
  return { ok: true, tag: el.tagName, cls: (el.className || "").toString().slice(0, 80) };
})()`;

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd) {
    console.log("targets | shot <png> [WxH|keep] | shotsel <sel> <png> | eval <js> | state | click <sel> | clicktext <text> [tag] | wait <ms>");
    return;
  }
  if (cmd === "targets") {
    const list = await (await fetch(`${BASE}/json/list`)).json();
    for (const t of list) console.log(`${t.type}\t${t.id}\t${t.title}\t${t.url.slice(0, 120)}`);
    return;
  }
  const { ws, page } = await connect();
  const rpc = makeRpc(ws);
  console.error(`attached: ${page.url.slice(0, 120)}`);

  if (cmd === "raw") {
    // node tools/cdp.mjs raw <CDP方法> '<json 参数>'
    const params = args[1] ? JSON.parse(args[1]) : {};
    console.log(JSON.stringify(await rpc(args[0], params), null, 2));
  } else if (cmd === "eval") {
    console.log(JSON.stringify(await evalInPage(rpc, args[0]), null, 2));
  } else if (cmd === "state") {
    console.log(await evalInPage(rpc, `document.body.innerText.slice(0, 6000)`));
  } else if (cmd === "click") {
    const r = await evalInPage(
      rpc,
      `(() => {
        const el = document.querySelector(${JSON.stringify(args[0])});
        if (!el) return "NOT FOUND";
        el.scrollIntoView({block:"center"});
        el.dispatchEvent(new MouseEvent("mousedown", {bubbles:true}));
        el.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));
        el.click();
        return "CLICKED";
      })()`
    );
    console.log(r);
    await sleep(700);
  } else if (cmd === "clicktext") {
    const expr = CLICK_TEXT_HELPER.replace("__ARGS__", JSON.stringify({ text: args[0], tag: args[1] || null }));
    console.log(JSON.stringify(await evalInPage(rpc, expr)));
    await sleep(700);
  } else if (cmd === "clicktitle") {
    // 按 title / aria-label 找元素并点击（活动栏按钮都是图标 + title）
    const r = await evalInPage(
      rpc,
      `(() => {
        const want = ${JSON.stringify(args[0])};
        const el = Array.from(document.querySelectorAll('[title], [aria-label]'))
          .find(e => (e.getAttribute('title') === want) || (e.getAttribute('aria-label') === want));
        if (!el) return { ok: false, reason: 'not found' };
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        const o = { bubbles: true, cancelable: true, clientX: r.left + r.width/2, clientY: r.top + r.height/2, view: window };
        el.dispatchEvent(new PointerEvent('pointerover', o));
        el.dispatchEvent(new MouseEvent('mouseover', o));
        el.dispatchEvent(new PointerEvent('pointerdown', o));
        el.dispatchEvent(new MouseEvent('mousedown', o));
        el.dispatchEvent(new PointerEvent('pointerup', o));
        el.dispatchEvent(new MouseEvent('mouseup', o));
        el.dispatchEvent(new MouseEvent('click', o));
        return { ok: true, tag: el.tagName, cls: (el.className||'').toString().slice(0, 60) };
      })()`
    );
    console.log(JSON.stringify(r));
    await sleep(900);
  } else if (cmd === "wait") {
    await sleep(Number(args[0]) || 1000);
    console.log("waited");
  } else if (cmd === "shot") {
    if (args[1] !== "keep") {
      let w = 1600,
        h = 1000;
      const m = /^(\d+)x(\d+)$/.exec(args[1] || "");
      if (m) {
        w = +m[1];
        h = +m[2];
      }
      await rpc("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: false });
      await sleep(600);
    }
    const r = await rpc("Page.captureScreenshot", { format: "png", fromSurface: true }, 60000);
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { dirname } = await import("node:path");
    mkdirSync(dirname(args[0]), { recursive: true });
    writeFileSync(args[0], Buffer.from(r.data, "base64"));
    console.log(`saved ${args[0]} (${Math.round(r.data.length / 1024)} KB b64)`);
  } else if (cmd === "shotsel") {
    // 元素级截图：先量出元素矩形（页面坐标），再用 clip 抓
    const box = await evalInPage(
      rpc,
      `(() => {
        const el = document.querySelector(${JSON.stringify(args[0])});
        if (!el) return null;
        el.scrollIntoView({block:"center"});
        const r = el.getBoundingClientRect();
        return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
      })()`
    );
    if (!box) throw new Error("element not found: " + args[0]);
    const r = await rpc(
      "Page.captureScreenshot",
      {
        format: "png",
        fromSurface: true,
        clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 2 },
      },
      60000
    );
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { dirname } = await import("node:path");
    mkdirSync(dirname(args[1]), { recursive: true });
    writeFileSync(args[1], Buffer.from(r.data, "base64"));
    console.log(`saved ${args[1]} (${Math.round(box.w)}x${Math.round(box.h)} @2x)`);
  } else {
    console.log("unknown command: " + cmd);
  }
  ws.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
