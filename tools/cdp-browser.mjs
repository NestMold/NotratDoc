// 浏览器级 CDP 控制（窗口几何/状态），用于让截图窗口真正「可见」。
// 用法：
//   node tools/cdp-browser.mjs info
//   node tools/cdp-browser.mjs normal [x y w h]
//   node tools/cdp-browser.mjs maximize
//   node tools/cdp-browser.mjs focus <targetId前缀>
const BASE = `http://127.0.0.1:${process.env.CDP_BASE || 9222}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function browserWs() {
  const v = await (await fetch(`${BASE}/json/version`)).json();
  return v.webSocketDebuggerUrl;
}
function rpcFactory(ws) {
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  };
  return (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      const t = setTimeout(() => rej(new Error("timeout " + method)), 15000);
      pending.set(i, (m) => {
        clearTimeout(t);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
      });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
}

const [cmd, ...args] = process.argv.slice(2);
const ws = new WebSocket(await browserWs());
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = () => rej(new Error("ws error"));
});
const rpc = rpcFactory(ws);
const targets = await rpc("Target.getTargets");
const pages = targets.targetInfos.filter((t) => t.type === "page");
const prefix = process.env.CDP_TARGET;
const main = (prefix && pages.find((t) => t.targetId.startsWith(prefix))) || pages.find((t) => t.url.includes("workspace=")) || pages[0];

async function windowOf(t) {
  const r = await rpc("Browser.getWindowForTarget", { targetId: t.targetId });
  return r;
}

if (cmd === "info") {
  for (const t of pages) {
    let w = null;
    try {
      w = await windowOf(t);
    } catch (e) {
      w = { error: e.message };
    }
    console.log(JSON.stringify({ targetId: t.targetId, url: t.url.slice(0, 80), window: w }));
  }
} else if (cmd === "normal" || cmd === "maximize") {
  const { windowId, bounds } = await windowOf(main);
  const [x, y, w, h] = args.length >= 4 ? args.map(Number) : [40, 40, 1120, 860];
  await rpc("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal" } });
  if (bounds.windowState === "minimized") await sleep(300);
  if (cmd === "normal") {
    await rpc("Browser.setWindowBounds", { windowId, bounds: { left: x, top: y, width: w, height: h, windowState: "normal" } });
  } else {
    await rpc("Browser.setWindowBounds", { windowId, bounds: { windowState: "maximized" } });
  }
  await sleep(500);
  console.log(JSON.stringify(await windowOf(main)));
} else if (cmd === "focus") {
  const t = pages.find((p) => p.targetId.startsWith(args[0] || "")) || main;
  const { windowId } = await windowOf(t);
  await rpc("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal" } });
  console.log("normalized " + t.targetId);
} else {
  console.log("info | normal [x y w h] | maximize | focus <targetId>");
}
ws.close();
process.exit(0);
