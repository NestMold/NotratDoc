// 主进程 capturePage 截图（窗口被遮挡/隐藏时也能出图 —— 不依赖合成器可见性）。
// 需要实例以 --inspect=9230 启动。
// 用法：node tools/main-shot.mjs <out.png> [wcId]
const PORT = process.env.INSPECT_PORT || 9230;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findWs(tries = 20) {
  for (let i = 0; i < tries; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      if (list.length) return list[0].webSocketDebuggerUrl;
    } catch {}
    await sleep(1000);
  }
  throw new Error("inspector not reachable");
}

const ws = new WebSocket(await findWs());
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = () => rej(new Error("ws error"));
});
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
const rpc = (method, params = {}, timeoutMs = 90000) =>
  new Promise((res, rej) => {
    const i = ++id;
    const t = setTimeout(() => rej(new Error("timeout " + method)), timeoutMs);
    pending.set(i, (m) => {
      clearTimeout(t);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    });
    ws.send(JSON.stringify({ id: i, method, params }));
  });

await rpc("Runtime.enable");

const [out, wcIdArg] = process.argv.slice(2);
const wcId = wcIdArg ? Number(wcIdArg) : 0;

// 表达式：取窗口 → 先亮窗/置顶（有副作用但必要）→ 等一帧 → capturePage → 落盘
const expr = `(function(){
  var E; try { E = require('electron'); } catch (e) { E = process.mainModule.require('electron'); }
  var fs = require('fs');
  var wins = E.BrowserWindow.getAllWindows().filter(function(w){ return !w.isDestroyed(); });
  var w = ${wcId ? `wins.filter(function(x){return x.webContents.id === ${wcId};})[0]` : `wins.filter(function(x){return (x.webContents.getURL()||'').indexOf('workspace=') >= 0;})[0] || wins[0]`};
  if (!w) return { error: 'no window', wins: wins.map(function(x){return x.webContents.id;}) };
  try { w.show(); w.setAlwaysOnTop(true, 'screen-saver'); } catch (e) {}
  var before = { id: w.id, wcId: w.webContents.id, vis: w.isVisible(), title: w.getTitle() };
  return w.webContents.capturePage().then(function(img){
    var png = img.toPNG();
    fs.writeFileSync(${JSON.stringify(out)}, png);
    return { window: before, size: img.getSize(), bytes: png.length };
  }).catch(function(e){ return { error: String(e), window: before }; });
})()`;

const r = await rpc("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true });
if (r.exceptionDetails) {
  console.error("exception: " + (r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails)).slice(0, 600));
  process.exit(1);
}
console.log(JSON.stringify(r.result.value, null, 2));
ws.close();
process.exit(0);
