// 统一截图入口：主进程 capturePage（窗口被遮挡/隐藏也能出图，不抢前台）。
// 需要实例以 --inspect=9230 启动。
//   node tools/shot.mjs <out.png> [WxH] [--sel <css 选择器>] [--nocrop] [--wait <ms>]
//
//   WxH            先把这个窗口设成该尺寸（CSS 像素，默认保持现状）
//   --sel          只截该元素（用页面内的坐标换算，元素不存在则整页）
//   --wait         截图前额外等待毫秒（默认 600）
const PORT = process.env.INSPECT_PORT || 9230;
// WIN_URL_FRAG：主进程按 URL 选窗时用的子串（默认抓工作区窗；多窗实例可用它点名别的窗）
const WIN_FRAG = process.env.WIN_URL_FRAG || "workspace=";
const WIN_EXACT = process.env.WIN_URL_EXACT || "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findWs(tries = 20) {
  for (let i = 0; i < tries; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      if (list.length) return list[0].webSocketDebuggerUrl;
    } catch {}
    await sleep(1000);
  }
  throw new Error("main inspector not reachable on " + PORT);
}
async function pageWs() {
  const base = `http://127.0.0.1:${process.env.CDP_BASE || 9223}`;
  const list = await (await fetch(`${base}/json/list`)).json();
  const p =
    (process.env.CDP_TARGET && list.find((t) => t.id.startsWith(process.env.CDP_TARGET))) ||
    list.find((t) => t.type === "page" && t.url.includes("workspace=")) ||
    list.find((t) => t.type === "page" && !t.url.includes("devtools"));
  return p;
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
  return (method, params = {}, timeoutMs = 30000) =>
    new Promise((res, rej) => {
      const i = ++id;
      const t = setTimeout(() => rej(new Error("timeout " + method)), timeoutMs);
      pending.set(i, (m) => {
        clearTimeout(t);
        m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
      });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
}
async function connectUrl(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error("ws error"));
  });
  return ws;
}

const argv = process.argv.slice(2);
const out = argv[0];
const rest = argv.slice(1);
let size = null, sel = null, waitMs = 600;
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a === "--sel") sel = rest[++i];
  else if (a === "--wait") waitMs = Number(rest[++i]);
  else if (/^\d+x\d+$/.test(a)) size = a.split("x").map(Number);
}

// 1) 页面：拿窗口尺寸/元素矩形
const page = await pageWs();
if (!page) throw new Error("no page target");
const pws = await connectUrl(page.webSocketDebuggerUrl);
const prpc = rpcFactory(pws);
const peval = async (expr) => {
  const r = await prpc("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("page exception: " + (r.exceptionDetails.exception?.description || "").slice(0, 300));
  return r.result.value;
};

// 2) 主进程：窗口按需改尺寸
const mws = await connectUrl(await findWs());
const mrpc = rpcFactory(mws);
await mrpc("Runtime.enable");
const meval = async (expr, timeoutMs = 90000) => {
  const r = await mrpc("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true }, timeoutMs);
  if (r.exceptionDetails) throw new Error("main exception: " + (r.exceptionDetails.exception?.description || "").slice(0, 400));
  return r.result.value;
};

const wcId = page.url.includes("workspace=") ? null : null; // 由主进程按 URL 选窗
await meval(`(function(){
  var E; try { E = require('electron'); } catch (e) { E = process.mainModule.require('electron'); }
  var WANT = ${JSON.stringify(WIN_EXACT)}, FRAG = ${JSON.stringify(WIN_FRAG)};
  var w = E.BrowserWindow.getAllWindows().filter(function(x){ var u = x.webContents.getURL()||''; return !x.isDestroyed() && (WANT ? u === WANT : u.indexOf(FRAG) >= 0); })[0];
  if (!w) return 'no-main-window';
  ${size ? `w.setBounds({ x: 40, y: 40, width: ${size[0]}, height: ${size[1]} });` : ""}
  try { w.webContents.setZoomFactor(1); } catch (e) {}
  if (!w.isVisible()) w.show();
  return { id: w.id, bounds: w.getBounds(), visible: w.isVisible() };
})()`);

await sleep(waitMs);

// 3) 元素矩形（可选）
let clip = null;
if (sel) {
  const box = await peval(`(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return null;
    el.scrollIntoView({ block: "start" });
    const r = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height, dpr };
  })()`);
  if (box && box.width > 4 && box.height > 4) clip = box;
}

// 4) 截图（主进程 capturePage；clip 按 dpr 换算）
const res = await meval(`(function(){
  var E; try { E = require('electron'); } catch (e) { E = process.mainModule.require('electron'); }
  var fs = require('fs');
  var WANT = ${JSON.stringify(WIN_EXACT)}, FRAG = ${JSON.stringify(WIN_FRAG)};
  var w = E.BrowserWindow.getAllWindows().filter(function(x){ var u = x.webContents.getURL()||''; return !x.isDestroyed() && (WANT ? u === WANT : u.indexOf(FRAG) >= 0); })[0];
  if (!w) return Promise.resolve({ error: 'no-main-window' });
  var opts = ${clip ? JSON.stringify({ x: Math.round(clip.x), y: Math.round(clip.y), width: Math.round(clip.width), height: Math.round(clip.height) }) : "undefined"};
  return w.webContents.capturePage(opts).then(function(img){
    var png = img.toPNG();
    fs.writeFileSync(${JSON.stringify(out)}, png);
    return { size: img.getSize(), bytes: png.length, window: w.getBounds() };
  }).catch(function(e){ return { error: String(e) }; });
})()`);
console.log(JSON.stringify(res));
pws.close();
mws.close();
process.exit(res && res.error ? 1 : 0);
