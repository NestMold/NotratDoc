// 终端单独一张：默认提示符会带出这台机器的 Windows 用户名，
// 截图要公开，所以先把 PS1 换成一个演示用提示符，再 clear 掉历史。
import { W, LOADED, IN_DEMO, SWITCH_TO_DEMO, NO_SPELLCHECK } from "./demo-ws.mjs";
import { CLICK_TEXT, CLEAN_UI, CLOSE_CHECKLIST, CLOSE_TERMINAL } from "./ui.mjs";

export default {
  steps: [
    SWITCH_TO_DEMO,
    { name: "工作区就绪", waitFor: IN_DEMO, timeout: 40000 },
    ...CLEAN_UI,
    CLOSE_CHECKLIST,
    CLOSE_TERMINAL,

    { name: "打开终端", eval: CLICK_TEXT("终端"), after: 3000 },
    { name: "点终端内容区", size: W, mouse: "left", at: [800, 800] },
    { wait: 800 },
    { name: "换提示符", insertText: "export PS1='demo@notrat MINGW64 $ '" },
    { name: "回车", key: "Enter" },
    { wait: 1200 },
    { name: "清屏", insertText: "clear" },
    { name: "回车", key: "Enter" },
    { wait: 1200 },
    { name: "跑一条 ls", insertText: "ls" },
    { name: "回车", key: "Enter" },
    { wait: 1500 },
    NO_SPELLCHECK,
    { name: "终端", shot: "guide/terminal", size: W, clip: [312, 660, 1096, 232], wait: 1200 },
    { name: "终端全图", shot: "guide/terminal-full", size: W, wait: 800 },
  ],
};
