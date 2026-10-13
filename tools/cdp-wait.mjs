// 轮询等待页面条件成立：node tools/cdp-wait.mjs "<js 表达式>" [超时秒数]
// 表达式求值为真值时退出 0 并打印结果；超时退出 1。
const BASE = `http://127.0.0.1:${process.env.CDP_BASE || 9222}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function attach() {
  const list = await (await fetch(`${BASE}/json/list`)).json();
  const page =
    (process.env.CDP_TARGET && list.find((t) => t.id.startsWith(process.env.CDP_TARGET))) ||
    list.find((t) => t.type === "page" && !t.url.includes("devtools") && t.url.includes("workspace=")) ||
    list.find((t) => t.type === "page" && !t.url.includes("devtools"));
  if (!page) throw new Error("no page target");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
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
  const rpc = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      const t = setTimeout(() => rej(new Error("timeout " + method)), 20000);
      pending.set(i, (m) => {
        clearTimeout(t);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
      });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  return { rpc, page };
}

const [expr, timeoutS] = process.argv.slice(2);
const deadline = Date.now() + (Number(timeoutS) || 90) * 1000;
let last;
while (Date.now() < deadline) {
  try {
    const { rpc, page } = await attach();
    const r = await rpc("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    last = r.exceptionDetails ? { err: r.exceptionDetails.exception?.description } : r.result.value;
    if (last && !last.err && !(typeof last === "object" && !Object.keys(last).length && !Array.isArray(last)) && last !== 0 && last !== "") {
      console.error("ready: " + page.url.slice(0, 100));
      console.log(JSON.stringify(last));
      process.exit(0);
    }
  } catch (e) {
    last = e.message;
  }
  await sleep(1500);
}
console.error("timeout waiting for: " + expr);
console.log(JSON.stringify(last));
process.exit(1);
