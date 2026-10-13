"""给「还没拍到的截图」生成占位图，让 vitepress build 能过。

VitePress 在构建期会把 ![](/shots/x.png) 当模块解析，文件不存在直接 build 失败——
所以缺图不能只靠 ignoreDeadLinks。

占位图长得一眼就是占位（浅灰底 + 虚线框 + 一行说明），拍到真图后直接覆盖同名文件即可。
用法：py -3 tools/placeholder-shots.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent / "public" / "shots"
W, H = 1200, 675
BG = (244, 245, 247, 255)
BORDER = (203, 209, 219, 255)
INK = (107, 114, 128, 255)
SUB = (156, 163, 175, 255)

# 需要占位的（未登录状态下拍不到的会员功能页）
MISSING = [
    "guide/agents-new.png",
    "guide/ai-add-provider.png",
    "guide/ai-provider-key.png",
    "guide/ai-provider-picker.png",
    "guide/chat-diff.png",
    "guide/chat-input.png",
    "guide/chat-panel.png",
    "guide/chat-skill-chip.png",
    "guide/details-dock.png",
    "guide/editor-autocomplete.png",
    "guide/gateway-add-bot.png",
    "guide/mcp-card.png",
    "guide/mcp-import.png",
    "guide/mention-panel.png",
    "guide/model-reasoning.png",
    "guide/model-selector.png",
    "guide/partner-mode.png",
    "guide/settings-agents.png",
    "guide/settings-ai.png",
    "guide/settings-gateway.png",
    "guide/settings-mcp.png",
    "guide/settings-skills.png",
]


def font(size: int):
    for name in ("msyh.ttc", "msyhl.ttc", "simhei.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)
        except OSError:
            continue
    return ImageFont.load_default()


def center(draw, text, fnt, y, fill):
    box = draw.textbbox((0, 0), text, font=fnt)
    draw.text(((W - (box[2] - box[0])) / 2, y), text, font=fnt, fill=fill)


def main():
    for rel in MISSING:
        out = ROOT / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        img = Image.new("RGB", (W, H), BG)
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([24, 24, W - 24, H - 24], radius=16, outline=BORDER, width=3)
        center(d, "截图待补", font(58), H / 2 - 96, INK)
        center(d, rel.replace("guide/", ""), font(30), H / 2 - 8, SUB)
        center(d, "会员功能页 · 登录后补拍", font(26), H / 2 + 52, SUB)
        img.save(out)
        print("wrote", rel)


if __name__ == "__main__":
    main()
