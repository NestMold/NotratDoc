// 在悬浮球那扇小窗里点一下（真实鼠标事件，走 CDP Input —— 小球用的是
// pointerdown/pointerup，JS 合成事件它不一定认）。
//   node tools/widget-click.mjs [x] [y] [left|right]
const BASE = `http://127.0.0.1:${process.env.CDP_BASE || 9223}`;
const [x = "22", y = "22", button = "left"] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const list = await (await fetch(`${BASE}/json/list`)).json();
const target = list.find((t) => t.url.includes("notrat-float-widget"));
if (!target) throw new Error("float widget target not found");

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const rpc = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    const t = setTimeout(() => rej(new Error("timeout " + method)), 15000);
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id === i) { clearTimeout(t); ws.removeEventListener("message", onMsg); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

const px = Number(x);
const py = Number(y);
const buttons = button === "right" ? 2 : 1;
await rpc("Input.dispatchMouseEvent", { type: "mouseMoved", x: px, y: py });
await sleep(120);
await rpc("Input.dispatchMouseEvent", { type: "mousePressed", x: px, y: py, button, buttons, clickCount: 1 });
await sleep(80);
await rpc("Input.dispatchMouseEvent", { type: "mouseReleased", x: px, y: py, button, buttons: 0, clickCount: 1 });
console.log(`${button}-clicked widget at ${px},${py}`);
ws.close();
process.exit(0);
