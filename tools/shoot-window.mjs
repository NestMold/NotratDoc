// 单独截某一扇窗口（悬浮球 / 便签这种独立小窗，主窗口截图管道够不着）。
//   node tools/shoot-window.mjs <url 片段> <输出名> [waitMs]
// 图片写到 public/shots/<输出名>.png。
const OUT_ROOT = new URL("../public/shots/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PORT = process.env.INSPECT_PORT || 9230;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const [match, name, waitMs = "800"] = process.argv.slice(2);
if (!match || !name) throw new Error("用法：shoot-window.mjs <url 片段> <输出名> [waitMs]");

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
if (!list.length) throw new Error("main inspector unreachable");
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const rpc = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    const t = setTimeout(() => rej(new Error("timeout " + method)), 30000);
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id === i) { clearTimeout(t); ws.removeEventListener("message", onMsg); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evalMain = async (expr) => {
  // includeCommandLineAPI: 让 Node inspector 里能直接用 require（主进程不是 ESM 场景）
  const r = await rpc("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval failed");
  return r.result.value;
};

await sleep(Number(waitMs));
const res = await evalMain(`(function(){
  var fs = require('fs'); var path = require('path');
  var E; try { E = require('electron'); } catch (e) { E = process.mainModule.require('electron'); }
  var w = E.BrowserWindow.getAllWindows().filter(function(x){
    return !x.isDestroyed() && (x.webContents.getURL() || '').indexOf(${JSON.stringify(match)}) >= 0;
  })[0];
  if (!w) return Promise.resolve({ error: 'window not found: ' + ${JSON.stringify(match)} });
  try { w.setAlwaysOnTop(true, 'screen-saver'); } catch (e) {}
  return w.webContents.capturePage().then(function(img){
    if (img.isEmpty()) return { error: 'empty-image' };
    var png = img.toPNG();
    var out = ${JSON.stringify(OUT_ROOT + name + ".png")};
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, png);
    return { ok: ${JSON.stringify(name)}, size: img.getSize(), bounds: w.getBounds(), kb: Math.round(png.length / 1024) };
  });
})()`);
console.log(JSON.stringify(res));
ws.close();
process.exit(res && res.error ? 1 : 0);
