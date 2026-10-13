// DOM 结构速览：node tools/domdump.mjs "<css 选择器>" [深度] [最大节点数]
// 打印子树里每个节点的 标签 + class + 文本首段，用来找可点的选择器。
import { spawn } from "node:child_process";
const sel = process.argv[2] || "body";
const depth = Number(process.argv[3] || 4);
const max = Number(process.argv[4] || 120);
const expr = `(() => {
  const root = document.querySelector(${JSON.stringify(sel)});
  if (!root) return "NOT FOUND: " + ${JSON.stringify(sel)};
  const out = [];
  (function walk(el, d, path) {
    if (out.length > ${max}) return;
    const cls = (el.className && typeof el.className === "string") ? el.className.split(/\\s+/).filter(c => /^[a-z]/i.test(c)).slice(0, 6).join(".") : "";
    const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(" ").replace(/\\s+/g, " ").slice(0, 46);
    const r = el.getBoundingClientRect();
    out.push("  ".repeat(d) + el.tagName.toLowerCase() + (cls ? "." + cls : "") + (own ? " :: " + own : "") + " [" + Math.round(r.width) + "x" + Math.round(r.height) + "@" + Math.round(r.left) + "," + Math.round(r.top) + "]");
    if (d >= ${depth}) return;
    for (const c of el.children) walk(c, d + 1, path);
  })(root, 0, "");
  return out.join("\\n");
})()`;
const p = spawn(process.execPath, [new URL("./cdp.mjs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "eval", expr], { stdio: ["ignore", "pipe", "inherit"], env: process.env });
let buf = "";
p.stdout.on("data", (d) => (buf += d));
p.on("close", () => {
  try { console.log(JSON.parse(buf)); } catch { console.log(buf); }
});
