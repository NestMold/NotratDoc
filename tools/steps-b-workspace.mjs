// 第二批：工作区菜单 + 文件树
const W = "1440x900";
const NEW_BTN = [197, 122]; // 文件树工具条上的「＋」
const BLANK = [700, 620]; // 编辑器正文空白处，用来关掉弹出层

export default {
  steps: [
    { name: "工作区菜单按钮", shot: "guide/workspace-menu-button", size: W, clip: [52, 0, 260, 56], wait: 500 },

    { name: "打开工作区菜单", size: W, mouse: "left", sel: ".left-panel-header-shell button:last-of-type" },
    { name: "菜单已开", waitFor: "document.body.innerText.includes('新建工作区')" },
    { name: "工作区菜单", shot: "guide/workspace-menu", size: W, clip: [52, 0, 460, 620], wait: 500 },
    { name: "点空白关菜单", size: W, mouse: "left", at: BLANK },
    { name: "菜单已关", waitFor: "!document.body.innerText.includes('新建工作区')" },

    { name: "文件树", shot: "guide/filetree", size: W, sel: ".file-tree-panel", wait: 600 },

    { name: "新建按钮位置", shot: "guide/filetree-new", size: W, clip: [52, 100, 260, 48], wait: 300 },
    { name: "打开新建菜单", size: W, mouse: "left", at: NEW_BTN },
    { name: "新建菜单", shot: "guide/filetree-new-menu", size: W, sel: ".file-tree-panel", wait: 500 },
    { name: "点空白关菜单2", size: W, mouse: "left", at: BLANK },
    { wait: 400 },

    { name: "右键文件", size: W, mouse: "right", text: "产品需求.md", scope: ".tree-container div" },
    { name: "右键菜单", shot: "guide/filetree-context-menu", size: W, wait: 700 },
    { name: "点空白关右键菜单", size: W, mouse: "left", at: BLANK },
    { wait: 400 },
  ],
};
