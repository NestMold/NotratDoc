// 截图脚本执行器：按步骤驱动应用并截图。
//   node tools/capture-run.mjs <steps.mjs> [--only <名字前缀>]
// 步骤文件导出一个数组（或 { steps, onStart, onEnd }），每步形如：
//   { name: "工作区总览", shot: "guide/workspace", size: "1440x900", sel: "#css" }
//   { eval: "js 表达式" } | { click: "选择器" } | { clickText: "文字" } | { wait: 800 }
// 图片写到 public/shots/<name>.png（name 即相对路径，带目录会自动创建）。
const OUT_ROOT = new URL("../public/shots/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PORT = process.env.INSPECT_PORT || 9230;
const PAGES = `http://127.0.0.1:${process.env.CDP_BASE || 9223}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connectUrl(url, tries = 20) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const ws = new WebSocket(url);
      await new Promise((res, rej) => {
        ws.onopen = res;
        ws.onerror = () => rej(new Error("ws error"));
      });
      return ws;
    } catch (e) {
      lastErr = e;
      await sleep(1000);
    }
  }
  throw lastErr || new Error("connect failed");
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

async function mainWs() {
  for (let i = 0; i < 20; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      if (list.length) return connectUrl(list[0].webSocketDebuggerUrl);
    } catch {}
    await sleep(1000);
  }
  throw new Error("main inspector unreachable");
}
async function pageWs(tries = 60) {
  // 应用刚启动时 CDP 端口要等几秒才起来，所以这里重试而不是一次就抛
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const list = await (await fetch(`${PAGES}/json/list`)).json();
      const p =
        list.find((t) => t.type === "page" && t.url.includes("workspace=")) ||
        (process.env.CDP_TARGET && list.find((t) => t.id.startsWith(process.env.CDP_TARGET))) ||
        list.find((t) => t.type === "page" && !t.url.includes("devtools"));
      if (p) return { ws: await connectUrl(p.webSocketDebuggerUrl), target: p };
      lastErr = new Error("no page");
    } catch (e) {
      lastErr = e;
    }
    await sleep(1000);
  }
  throw lastErr || new Error("no page");
}

const opts = process.argv.slice(2);
const onlyIdx = opts.indexOf("--only");
const only = onlyIdx >= 0 ? opts[onlyIdx + 1] : null;
const stepsPath = opts[0];
const mod = await import(new URL(`file:///${stepsPath.replace(/\\/g, "/")}`).href);
const steps = Array.isArray(mod.default) ? mod.default : mod.default.steps;
const onStart = Array.isArray(mod.default) ? null : mod.default.onStart;
const onEnd = Array.isArray(mod.default) ? null : mod.default.onEnd;

const mws = await mainWs();
const mrpc = rpcFactory(mws);
await mrpc("Runtime.enable");
const meval = async (expr, timeoutMs = 60000) => {
  const r = await mrpc("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true }, timeoutMs);
  if (r.exceptionDetails) throw new Error("main: " + (r.exceptionDetails.exception?.description || "").slice(0, 300));
  return r.result.value;
};

// 主窗口：优先「URL 里带 workspace= 的那扇」，其次退到「任何一扇应用窗口」。
// 后者是给启动封面那种场景用的——那时应用还没导航到 ?workspace=…
const MAIN_WIN = `(function(){
  var E; try { E = require('electron'); } catch (e) { E = process.mainModule.require('electron'); }
  var ws = E.BrowserWindow.getAllWindows().filter(function(x){
    var u = (x.webContents && x.webContents.getURL()) || '';
    return !x.isDestroyed() && u.indexOf('devtools') < 0;
  });
  var byWorkspace = ws.filter(function(x){ return (x.webContents.getURL()||'').indexOf('workspace=') >= 0; });
  var byApp = ws.filter(function(x){ return (x.webContents.getURL()||'').indexOf('localhost:46817') >= 0; });
  return byWorkspace[0] || byApp[0] || ws[0];
})()`;

// 截图前统一保证窗口"真可见"（否则 capturePage 出空图 / 视口尺寸是旧帧的）。
// 三个坑：① 最小化时 getBounds 仍报旧值、渲染层 innerWidth 也是最后一次合成的值；
// ② DevTools 停靠打开会吃掉一半视口宽（1440 → 885）；③ 只 show() 不会把最小化的窗口拉回来。
async function ensureVisible(size) {
  const r = await meval(`(function(){
    var w = ${MAIN_WIN};
    if (!w) return { error: 'no-window' };
    try { if (w.webContents.isDevToolsOpened()) w.webContents.closeDevTools(); } catch (e) {}
    try { if (w.isMinimized()) w.restore(); } catch (e) {}
    try { if (!w.isVisible()) w.show(); w.setAlwaysOnTop(true, 'screen-saver'); } catch (e) {}
    ${size ? `w.setBounds({ x: 40, y: 40, width: ${size[0]}, height: ${size[1]} });` : ""}
    // 页面缩放必须归 1：Windows 125% 缩放下视口会变成窗口的 0.8 倍（1440 → 1152），
    // 截图里布局就是「放大版」，和用户默认看到的不一样。应用自己也会在启动时改缩放，所以每张都重设。
    try { w.webContents.setZoomFactor(1); } catch (e) {}
    return { bounds: w.getBounds(), content: w.getContentBounds(), zoom: w.webContents.getZoomFactor(), min: w.isMinimized(), dt: w.webContents.isDevToolsOpened() };
  })()`);
  if (r && r.error) throw new Error(r.error);
  if (r && r.content && r.content.width === 0) throw new Error("窗口被最小化后仍未恢复：" + JSON.stringify(r));
  return r;
}

const { ws: pws, target } = await pageWs();
const prpc = rpcFactory(pws);
const peval = async (expr, tag = "") => {
  const r = await prpc("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(`page(${tag}): ` + (r.exceptionDetails.exception?.description || "").slice(0, 300));
  return r.result.value;
};

async function shoot(step) {
  const size = step.size ? step.size.split("x").map(Number) : null;
  const win = await ensureVisible(size);
  await sleep(step.wait ?? 700);
  let vp0 = await peval(`({ w: window.innerWidth, h: window.innerHeight })`);
  if (win && win.content && win.content.width && vp0.w !== win.content.width) {
    await meval(`(function(){ var w = ${MAIN_WIN}; if (w) w.webContents.setZoomFactor(1); return 1; })()`);
    await sleep(500);
    vp0 = await peval(`({ w: window.innerWidth, h: window.innerHeight })`);
    if (vp0.w !== win.content.width) {
      console.warn(`  ! 视口 ${vp0.w}x${vp0.h} 与窗口内容区 ${win.content.width}x${win.content.height} 仍不一致`);
    }
  }
  let clip = null;
  if (step.clip) {
    // 坐标裁剪 [x, y, w, h]（CSS 像素，窗口内坐标）——比选择器稳，适合标题栏/状态栏这类窄条
    const [cx, cy, cw, ch] = step.clip;
    const vp = await peval(`({ w: window.innerWidth, h: window.innerHeight })`);
    clip = {
      x: cx < 0 ? vp.w + cx : cx,
      y: cy < 0 ? vp.h + cy : cy,
      width: Math.min(cw, vp.w),
      height: Math.min(ch, vp.h),
    };
  } else if (step.sel) {
    clip = await peval(`(() => {
      const el = document.querySelector(${JSON.stringify(step.sel)});
      if (!el) return null;
      el.scrollIntoView({ block: "start" });
      const r = el.getBoundingClientRect();
      return r.width > 4 && r.height > 4 ? { x: r.left, y: r.top, width: r.width, height: r.height } : null;
    })()`);
  }
  const outPath = `${OUT_ROOT}${step.shot}.png`;
  const res = await meval(`(function(){
    var fs = require('fs'); var path = require('path');
    var w = ${MAIN_WIN};
    if (!w) return Promise.resolve({ error: 'no-window' });
    var opts = ${clip ? JSON.stringify({ x: Math.round(Math.max(0, clip.x)), y: Math.round(Math.max(0, clip.y)), width: Math.round(clip.width), height: Math.round(clip.height) }) : "undefined"};
    return w.webContents.capturePage(opts).then(function(img){
      if (img.isEmpty()) return { error: 'empty-image' };
      var png = img.toPNG();
      fs.mkdirSync(path.dirname(${JSON.stringify(outPath)}), { recursive: true });
      fs.writeFileSync(${JSON.stringify(outPath)}, png);
      return { ok: ${JSON.stringify(step.shot)}, size: img.getSize(), kb: Math.round(png.length / 1024) };
    }).catch(function(e){ return { error: String(e) }; });
  })()`);
  if (res && res.error) throw new Error(`shot ${step.shot}: ${res.error}`);
  console.log("  " + JSON.stringify(res));
}

// 真实鼠标事件（Input 域）——右键菜单、悬停态必须走这条，JS 合成的事件 React 有时不认
async function mouseOn(step) {
  const p = step.at
    ? { x: Math.round(step.at[0]), y: Math.round(step.at[1]) }
    : await peval(`(() => {
    let el = null;
    ${
      step.text
        ? `{
      const want = ${JSON.stringify(step.text)}.replace(/\\s+/g, " ").trim();
      const scope = ${JSON.stringify(step.scope || "*")};
      const all = Array.from(document.querySelectorAll(scope));
      const hits = all.filter((x) => (x.innerText || "").replace(/\\s+/g, " ").trim() === want);
      el = hits[hits.length - 1] || null;
    }`
        : step.textHas
        ? `{
      const want = ${JSON.stringify(step.textHas)};
      const scope = ${JSON.stringify(step.scope || "*")};
      const hits = Array.from(document.querySelectorAll(scope)).filter(
        (x) => (x.innerText || "").includes(want)
      );
      // 取「最小的那个」——最贴近这段文字的元素，点它最准
      hits.sort((a, b) => (a.innerText || "").length - (b.innerText || "").length);
      el = hits[0] || null;
    }`
        : `el = document.querySelector(${JSON.stringify(step.sel)});`
    }
    if (!el) return null;
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return { error: "zero-size" };
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  })()`);
  if (!p) throw new Error("target not found: " + (step.sel || step.text));
  if (p.error) throw new Error(step.sel + ": " + p.error);
  const btn = step.mouse === "right" ? "right" : "left";
  const buttons = btn === "right" ? 2 : 1;
  await prpc("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y });
  if (step.hoverOnly) return "hover " + p.x + "," + p.y;
  await prpc("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: btn, buttons, clickCount: 1 });
  await sleep(60);
  await prpc("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: btn, buttons: 0, clickCount: 1 });
  return (btn === "right" ? "right-click " : "click ") + p.x + "," + p.y;
}

console.log(`target: ${target.url.slice(0, 90)}`);
if (onStart) await onStart({ peval, meval, sleep });
let i = 0;
for (const step of steps) {
  i++;
  if (only && !(step.name || step.shot || "").startsWith(only)) continue;
  const label = step.name || step.shot || step.eval?.slice(0, 40) || `step ${i}`;
  process.stdout.write(`[${i}/${steps.length}] ${label} … `);
  try {
    if (step.eval) {
      const r = await peval(step.eval, label);
      console.log("eval ok" + (r !== undefined && r !== null ? " " + JSON.stringify(r).slice(0, 80) : ""));
    } else if (step.click) {
      await peval(`(() => { const el = document.querySelector(${JSON.stringify(step.click)}); if (!el) return 'NOT FOUND'; el.scrollIntoView({block:'center'}); el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})); el.click(); return 'clicked'; })()`, label)
        .then((r) => console.log(r));
    } else if (step.clickText) {
      const r = await peval(`(() => {
        const norm = (s) => (s||'').replace(/\\s+/g,' ').trim();
        const wanted = norm(${JSON.stringify(step.clickText)});
        const all = Array.from(document.querySelectorAll(${JSON.stringify(step.clickTextTag || "*")}));
        const cands = all.filter(el => norm(el.innerText) === wanted || norm(Array.from(el.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ')) === wanted);
        const el = cands[cands.length-1];
        if (!el) return 'NOT FOUND: ' + wanted;
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
        return 'clicked: ' + el.tagName;
      })()`, label);
      console.log(r);
    } else if (step.mouse && (step.sel || step.text || step.textHas || step.at)) {
      console.log(await mouseOn(step));
    } else if (step.key) {
      // { key: "f", ctrl: true } / { key: "Escape" }
      const codes = { Escape: 27, Enter: 13, Tab: 9, Backspace: 8, Delete: 46, ArrowDown: 40, ArrowUp: 38 };
      const code = codes[step.key] || step.key.toUpperCase().charCodeAt(0);
      const modifiers = (step.alt ? 1 : 0) | (step.ctrl ? 2 : 0) | (step.shift ? 8 : 0);
      const base = { key: step.key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, modifiers };
      await prpc("Input.dispatchKeyEvent", { type: "keyDown", ...base });
      await prpc("Input.dispatchKeyEvent", { type: "keyUp", ...base });
      console.log("key " + (step.ctrl ? "Ctrl+" : "") + step.key);
    } else if (step.insertText !== undefined) {
      // 一次性把整串文字插进焦点元素（走 Input.insertText）。
      // 终端（xterm.js）用逐字 keydown 会丢字，必须用这个。
      await prpc("Input.insertText", { text: step.insertText });
      await sleep(step.delay ?? 400);
      console.log("inserted " + JSON.stringify(step.insertText));
    } else if (step.type !== undefined) {
      // 逐字敲键盘：ProseMirror 只认真实 keydown/char，不能直接改 DOM
      for (const ch of step.type) {
        const code = ch === "/" ? 191 : ch === " " ? 32 : ch.charCodeAt(0);
        const base = { key: ch, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
        await prpc("Input.dispatchKeyEvent", { type: "keyDown", text: ch, unmodifiedText: ch, ...base });
        await prpc("Input.dispatchKeyEvent", { type: "keyUp", ...base });
        await sleep(step.delay ?? 90);
      }
      console.log("typed " + JSON.stringify(step.type));
    } else if (step.waitFor) {
      // 等一个页面条件成立：{ waitFor: "js 表达式", timeout: 20000 }
      const t0 = Date.now();
      const limit = step.timeout ?? 20000;
      let ok = false;
      while (Date.now() - t0 < limit) {
        if (await peval(`!!(${step.waitFor})`)) { ok = true; break; }
        await sleep(400);
      }
      console.log(ok ? `ok (${((Date.now() - t0) / 1000).toFixed(1)}s)` : `TIMEOUT ${limit}ms`);
    } else if (step.goto) {
      await peval(`location.href=${JSON.stringify(step.goto)}`);
      console.log("navigated");
    } else if (step.shot) {
      await shoot(step);
    } else if (step.wait) {
      await sleep(step.wait);
      console.log("waited");
    } else {
      console.log("(空步骤)");
    }
    if (step.after) await sleep(step.after);
  } catch (e) {
    console.log("FAILED: " + e.message.slice(0, 200));
  }
}
if (onEnd) await onEnd({ peval, meval, sleep });
pws.close();
mws.close();
process.exit(0);
