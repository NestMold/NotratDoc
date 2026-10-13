// 第一批：界面骨架（工作台模式，未登录 = 纯净版）
import { DEMO_URL, LOADED } from "./demo-ws.mjs";
const W = "1440x900";

export default {
  onStart: async ({ peval, sleep }) => {
    if (!(await peval(`location.href`)).includes("workspace=")) {
      await peval(`location.href=${JSON.stringify(DEMO_URL)}`);
    } else if (!(await peval(`location.href`)).includes(encodeURIComponent("我的笔记"))) {
      await peval(`location.href=${JSON.stringify(DEMO_URL)}`);
    }
    for (let i = 0; i < 40; i++) {
      if (await peval(LOADED)) return;
      await sleep(1000);
    }
    throw new Error("工作区 40s 未加载完成");
  },
  steps: [
    { name: "界面总览", shot: "guide/interface-overview", size: W, wait: 1200 },
    { name: "标题栏", shot: "guide/titlebar", size: W, clip: [52, 0, 1388, 56], wait: 500 },
    { name: "活动栏", shot: "guide/activity-bar", size: W, clip: [0, 0, 52, 900], wait: 500 },
    { name: "状态栏", shot: "guide/statusbar", size: W, sel: ".status-bar-shell", wait: 500 },
    { name: "工作区总览", shot: "guide/workspace-overview", size: W, wait: 800 },
  ],
};
