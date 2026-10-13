// 主进程 Node inspector 客户端：在 Electron 主进程里求值。
// 需要实例以 --inspect=9230 启动。
// 用法：
//   node tools/main-eval.mjs "<js 表达式>"              # 求值（awaitPromise）
//   node tools/main-eval.mjs --show                     # 显示并置顶所有窗口
//   node tools/main-eval.mjs --cap <out.png> [targetId] # 主进程 capturePage 截图
const PORT = process.env.INSPECT_PORT || 9230;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findTarget(tries = 20) {
  for (let i = 0; i < tries; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      if (list.length) return list[0].webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  throw new Error(`inspector not reachable on ${PORT}`);
}

const ws = new WebSocket(await findTarget());
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
const rpc = (method, params = {}, timeoutMs = 60000) =>
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
const evaluate = async (expression) => {
  const r = await rpc("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
    includeCommandLineAPI: true,
    // 注意：别开 replMode —— 开了之后「返回 Promise 的表达式」一律序列化成 {}，
    // capturePage 这类必须 await 的调用就全废了（--cap 一直返回空对象）。
  });
  if (r.exceptionDetails) throw new Error("exception: " + (r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails)));
  return r.result.value;
};

const [cmd, ...args] = process.argv.slice(2);

// 主进程里的 electron 取用：inspector 的 REPL 上下文里 require 不可靠，用 mainModule。
const E = `(process.mainModule || process.mainModule0 || require('module')._cache[require('module')._cache ? Object.keys(require('module')._cache).find(k=>k.endsWith('index.js')||true) : ''])`;
const GET_ELECTRON = `(function(){ try { return require('electron'); } catch(e) { return process.mainModule.require('electron'); } })()`;

if (cmd === "--show") {
  const r = await evaluate(`(() => {
    const { BrowserWindow } = ${GET_ELECTRON};
    const out = [];
    for (const w of BrowserWindow.getAllWindows()) {
      try {
        if (!w.isVisible()) w.show();
        w.setAlwaysOnTop(true, "screen-saver");
        out.push({ id: w.id, title: w.getTitle(), visible: w.isVisible(), bounds: w.getBounds() });
      } catch (e) { out.push({ id: w.id, error: String(e) }); }
    }
    return out;
  })()`);
  console.log(JSON.stringify(r, null, 2));
} else if (cmd === "--cap") {
  const out = args[0];
  const want = args[1];
  const r = await evaluate(`(async () => {
    const REQ = (process.mainModule || {}).require || require;
    const { BrowserWindow } = ${GET_ELECTRON};
    const ws = BrowserWindow.getAllWindows().filter(w => !w.isDestroyed());
    const w = ${want ? `ws.find(x => String(x.webContents.id) === ${JSON.stringify(want)}) || ws[0]` : "ws[0]"};
    const img = await w.webContents.capturePage();
    const sz = img.getSize();
    const { writeFileSync } = REQ("fs");
    writeFileSync(${JSON.stringify(out)}, img.toPNG());
    return { id: w.id, title: w.getTitle(), size: sz, bytes: img.toPNG().length, list: ws.map(x => ({ id: x.id, t: x.getTitle().slice(0,40), vis: x.isVisible() })) };
  })()`);
  console.log(JSON.stringify(r, null, 2));
} else {
  // 表达式整体在 cmd 里（args 只是它被 shell 拆开的余下部分）
  console.log(JSON.stringify(await evaluate([cmd, ...args].join(" ")), null, 2));
}
ws.close();
process.exit(0);
