// 把测试实例的「最近工作区」改成一份干净、看起来像真实使用的清单。
// 用法：node tools/set-recent.mjs   （必须在测试实例**关闭**时跑，否则会被内存里的 store 覆盖）
//
// 挑路径的规矩：只用 G: 盘的演示目录。C:\Users\<用户名>\... 会把 Windows 账号名带进
// 欢迎屏截图，那是要公开在文档里的。
import fs from "node:fs";
import path from "node:path";

const file = path.join(process.env.APPDATA || "", "notrat-test", "recent-workspaces.json");
const list = [
  "G:\\tmp\\我的笔记",
  "G:\\tmp\\读书笔记",
  "G:\\tmp\\产品草稿",
  "G:\\front_project\\Notrat",
];
fs.writeFileSync(file, JSON.stringify({ recentWorkspaces: list }, null, 2), "utf8");
console.log(file);
console.log(fs.readFileSync(file, "utf8"));
