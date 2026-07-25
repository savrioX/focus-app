"""
trial_reel_graphic.py — Cold intro graphic for Instagram trial reel
Audience: complete strangers. Must instantly answer:
  WHO are you? WHAT are you building? WHY does it matter?
"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1080, 1920
OUT  = r"C:\Users\klszo\focus-app\instagram_content\compound_story\trial_reel_intro.png"

SAFE_LEFT   = 80
SAFE_RIGHT  = W - 140
SAFE_W      = SAFE_RIGHT - SAFE_LEFT
SAFE_TOP    = 120
SAFE_BOTTOM = 1480

PURPLE = (124, 58,  237)
PUR2   = (167, 105, 255)
PUR3   = (210, 185, 255)
WHITE  = (255, 255, 255)
GREY   = (110, 110, 110)
LGREY  = (185, 185, 185)

BOLD = r"C:\Windows\Fonts\arialbd.ttf"
REG  = r"C:\Windows\Fonts\arial.ttf"

def f(path, size): return ImageFont.truetype(path, size)
def lh(fnt, gap=16):
    bb = fnt.getbbox("Ag")
    return (bb[3] - bb[1]) + gap

def cx(draw, text, y, fnt, color=WHITE):
    words = text.split()
    lines, cur = [], []
    for w in words:
        if draw.textlength(" ".join(cur+[w]), font=fnt) <= SAFE_W:
            cur.append(w)
        else:
            if cur: lines.append(" ".join(cur))
            cur = [w]
    if cur: lines.append(" ".join(cur))
    for line in lines:
        tw = draw.textlength(line, font=fnt)
        draw.text(((W-tw)//2, y), line, font=fnt, fill=color)
        y += lh(fnt)
    return y

img = Image.new("RGB", (W, H), (8, 8, 8))
d   = ImageDraw.Draw(img)

# gradient background
for i in range(H):
    t = i / (H - 1)
    r = int(18*(1-t) + 6*t)
    g = int(6*(1-t)  + 2*t)
    b = int(52*(1-t) + 14*t)
    d.rectangle([0, i, W, i+1], fill=(r, g, b))

cy = SAFE_TOP + 50

# ── Top label ─────────────────────────────────────────────────────
ft_label = f(REG, 32)
label = "meet the builder"
lw = d.textlength(label, font=ft_label)
# pill
px, py = 36, 14
x0 = W//2 - int(lw)//2 - px
x1 = W//2 + int(lw)//2 + px
y1 = cy + lh(ft_label, 0) + py*2
d.rounded_rectangle([x0, cy, x1, y1], radius=(y1-cy)//2, fill=(30, 12, 72))
d.text((W//2 - int(lw)//2, cy + py), label, font=ft_label, fill=PUR2)
cy = y1 + 50

# ── Big hook ──────────────────────────────────────────────────────
cy = cx(d, "I'm 19.", cy, f(BOLD, 160), WHITE)
cy += 6
cy = cx(d, "I build apps", cy, f(BOLD, 96), LGREY)
cy = cx(d, "with AI.", cy, f(BOLD, 96), PUR2)
cy += 50

# divider
d.rectangle([W//2-40, cy, W//2+40, cy+4], fill=PURPLE)
cy += 48

# ── What I'm building ─────────────────────────────────────────────
cy = cx(d, "My current project is called", cy, f(REG, 48), GREY)
cy += 6
cy = cx(d, "Compound.", cy, f(BOLD, 90), WHITE)
cy += 20
cy = cx(d, "A productivity app that replaces", cy, f(REG, 50), LGREY)
cy = cx(d, "every tool you're already using.", cy, f(REG, 50), LGREY)
cy += 40

# ── Feature row ───────────────────────────────────────────────────
features = ["Goals", "Habits", "Tasks", "AI coach"]
fw = (SAFE_RIGHT - SAFE_LEFT - 24) // 4
tile_h = 90
tile_y = cy
for i, feat in enumerate(features):
    tx = SAFE_LEFT + i * (fw + 8)
    d.rounded_rectangle([tx, tile_y, tx+fw, tile_y+tile_h], radius=12, fill=(20, 10, 50))
    d.rectangle([tx, tile_y, tx+8, tile_y+tile_h], fill=PURPLE)
    ft = f(BOLD, 30)
    tw = d.textlength(feat, font=ft)
    d.text((tx + fw//2 - int(tw)//2, tile_y + (tile_h - lh(ft,0))//2),
           feat, font=ft, fill=PUR3)
cy = tile_y + tile_h + 40

# ── The why ───────────────────────────────────────────────────────
cy = cx(d, "Built it because nothing like it existed.", cy, f(REG, 46), GREY)
cy += 10
cy = cx(d, "Now it's live and people use it.", cy, f(BOLD, 50), WHITE)
cy += 50

# ── CTA button ────────────────────────────────────────────────────
btn_y = min(cy, SAFE_BOTTOM - 108 - 60)
d.rounded_rectangle([SAFE_LEFT, btn_y, SAFE_RIGHT, btn_y+100],
                    radius=26, fill=PURPLE)
ft_btn = f(BOLD, 50)
t = "dailycompound.app  —  free to try"
tw = d.textlength(t, font=ft_btn)
d.text(((W-tw)//2, btn_y + (100-lh(ft_btn,0))//2), t, font=ft_btn, fill=WHITE)

# ── Watermark ─────────────────────────────────────────────────────
ft_wm = f(REG, 26)
wm = "@thestartupjournal_"
ww = d.textlength(wm, font=ft_wm)
d.text(((W-ww)//2, SAFE_BOTTOM - lh(ft_wm) - 10), wm, font=ft_wm, fill=(60, 60, 60))

img.save(OUT)
print(f"Saved: {OUT}")
