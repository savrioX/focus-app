"""
compound_posts.py — 5 simple, bold, app-marketing posts for Compound / dailycompound.app
9:16  (1080×1920)  |  dark bg  |  purple accent  |  minimal text
"""
from PIL import Image, ImageDraw, ImageFont
import os, textwrap

W, H = 1080, 1920
OUT  = r"C:\Users\klszo\focus-app\instagram_content\compound"
SS   = r"C:\Users\klszo\focus-app\instagram_content\screenshots"
os.makedirs(OUT, exist_ok=True)

# ── palette ────────────────────────────────────────────────────────────────
BG     = (8,   8,   8)
PURPLE = (124, 58,  237)
PUR2   = (167, 105, 255)
PUR3   = (210, 185, 255)
WHITE  = (255, 255, 255)
GREY   = (130, 130, 130)
LGREY  = (190, 190, 190)
DGREY  = (24,  24,  24)
CARD   = (20,  8,   52)

BOLD = r"C:\Windows\Fonts\arialbd.ttf"
REG  = r"C:\Windows\Fonts\arial.ttf"

def f(path, size): return ImageFont.truetype(path, size)

def canvas():
    img = Image.new("RGB", (W, H), BG)
    return img, ImageDraw.Draw(img)

def lh(fnt, gap=16):
    bb = fnt.getbbox("Ag")
    return (bb[3] - bb[1]) + gap

def vgrad(draw, top, bot, y0=0, y1=H):
    for i in range(y1 - y0):
        t = i / max(y1 - y0 - 1, 1)
        draw.rectangle([0, y0+i, W, y0+i+1], fill=(
            int(top[0]*(1-t) + bot[0]*t),
            int(top[1]*(1-t) + bot[1]*t),
            int(top[2]*(1-t) + bot[2]*t),
        ))

def cx(draw, text, y, fnt, color=WHITE, max_w=960):
    """Centered word-wrapped text. Returns y below last line."""
    words = text.split()
    lines, cur = [], []
    for w in words:
        t = " ".join(cur + [w])
        if draw.textlength(t, font=fnt) <= max_w:
            cur.append(w)
        else:
            if cur: lines.append(" ".join(cur))
            cur = [w]
    if cur: lines.append(" ".join(cur))
    line_h = lh(fnt)
    for line in lines:
        tw = draw.textlength(line, font=fnt)
        draw.text(((W - tw) // 2, y), line, font=fnt, fill=color)
        y += line_h
    return y

def wmark(draw):
    ft = f(REG, 26)
    t  = "dailycompound.app"
    tw = draw.textlength(t, font=ft)
    draw.text(((W - tw)//2, 1868), t, font=ft, fill=(60, 60, 60))

def pill(draw, y, text, fnt=None, bg=PURPLE, fg=WHITE, px=48, py=20):
    """Centered pill badge. Returns y below."""
    if fnt is None: fnt = f(BOLD, 34)
    tw = draw.textlength(text, font=fnt)
    th = lh(fnt, 0)
    x0 = W//2 - int(tw)//2 - px
    x1 = W//2 + int(tw)//2 + px
    y1 = y + th + py * 2
    r  = (y1 - y) // 2
    draw.rounded_rectangle([x0, y, x1, y1], radius=r, fill=bg)
    draw.text((W//2 - int(tw)//2, y + py), text, font=fnt, fill=fg)
    return y1 + 20

def screenshot_placeholder(draw, y, label, height=560):
    """A clean screenshot placeholder box. Returns y below."""
    mx = 60
    draw.rounded_rectangle([mx, y, W-mx, y+height], radius=20, fill=DGREY)
    draw.rounded_rectangle([mx, y, W-mx, y+height], radius=20, outline=(40,20,90), width=2)
    ft = f(REG, 32)
    tw = draw.textlength(label, font=ft)
    draw.text(((W-tw)//2, y + height//2 - lh(ft)//2), label, font=ft, fill=(60,60,60))
    return y + height + 20

def embed_ss(img, path, y, margin=60, max_h=560):
    """Embed a real screenshot. Returns y below."""
    ss = Image.open(path).convert("RGB")
    aw = W - margin * 2
    r  = min(aw / ss.width, max_h / ss.height)
    nw, nh = int(ss.width * r), int(ss.height * r)
    ss = ss.resize((nw, nh), Image.LANCZOS)
    mask = Image.new("L", (nw, nh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, nw, nh], radius=22, fill=255)
    border = Image.new("RGB", (nw+6, nh+6), (50,20,100))
    border.paste(ss, (3, 3), mask)
    img.paste(border, ((W - border.width)//2, y))
    return y + border.height + 20

def save(img, name):
    img.save(os.path.join(OUT, name))
    print(f"  saved: {name}")


# ══════════════════════════════════════════════════════════════════════════
# POST 1 — THE HOOK  "Most people set goals and forget them."
# ══════════════════════════════════════════════════════════════════════════
def post1():
    img, d = canvas()
    vgrad(d, (18, 6, 50), (6, 2, 14))

    cy = 260

    # small top label
    cy = pill(d, cy, "the problem", f(BOLD, 30), bg=(30, 12, 72), fg=PUR2, px=36, py=14)
    cy += 60

    # big headline — 3 lines, huge
    cy = cx(d, "Most people", cy, f(BOLD, 118), WHITE)
    cy = cx(d, "set goals.", cy, f(BOLD, 118), PUR2)
    cy += 20
    cy = cx(d, "Then forget them.", cy, f(BOLD, 80), LGREY, max_w=940)
    cy += 80

    # divider
    d.rectangle([W//2-40, cy, W//2+40, cy+4], fill=PURPLE)
    cy += 60

    # sub line
    cy = cx(d, "Compound fixes that.", cy, f(BOLD, 60), WHITE)
    cy += 32
    cy = cx(d, "Goals. Habits. Focus. AI coach.", cy, f(REG, 44), GREY, max_w=860)
    cy += 80

    # bottom CTA strip
    d.rounded_rectangle([60, cy, W-60, cy+110], radius=22, fill=PURPLE)
    ft = f(BOLD, 46)
    t  = "dailycompound.app   →   free to start"
    tw = d.textlength(t, font=ft)
    d.text(((W-tw)//2, cy + 32), t, font=ft, fill=WHITE)

    wmark(d)
    save(img, "post1_hook.png")


# ══════════════════════════════════════════════════════════════════════════
# POST 2 — GOALS FEATURE  "Type your goal. Get a plan."
# ══════════════════════════════════════════════════════════════════════════
def post2():
    img, d = canvas()
    vgrad(d, (14, 4, 40), (4, 2, 12))

    cy = 200

    cy = pill(d, cy, "goals", f(BOLD, 30), bg=(30, 12, 72), fg=PUR2, px=36, py=14)
    cy += 70

    cy = cx(d, "Type your goal.", cy, f(BOLD, 110), WHITE)
    cy += 10
    cy = cx(d, "Get a plan.", cy, f(BOLD, 110), PUR2)
    cy += 50

    cy = cx(d, "AI breaks any goal into daily action steps.", cy, f(REG, 46), LGREY, max_w=900)
    cy += 60

    # screenshot
    ss_path = os.path.join(SS, "app_dashboard.png")
    if os.path.exists(ss_path):
        cy = embed_ss(img, ss_path, cy)
    else:
        cy = screenshot_placeholder(d, cy, "[app_dashboard.png]", height=520)

    cy += 20
    cy = cx(d, "No more staring at a blank page.", cy, f(REG, 40), GREY, max_w=860)

    wmark(d)
    save(img, "post2_goals.png")


# ══════════════════════════════════════════════════════════════════════════
# POST 3 — HABITS FEATURE  "Small habits. Big results."
# ══════════════════════════════════════════════════════════════════════════
def post3():
    img, d = canvas()
    vgrad(d, (10, 30, 20), (4, 8, 6))

    cy = 200

    cy = pill(d, cy, "habits", f(BOLD, 30), bg=(10,40,22), fg=(52,211,103), px=36, py=14)
    cy += 70

    cy = cx(d, "Small habits.", cy, f(BOLD, 110), WHITE)
    cy += 10
    cy = cx(d, "Big results.", cy, f(BOLD, 110), (52, 211, 103))
    cy += 50

    cy = cx(d, "Track streaks. See your 7-day progress.", cy, f(REG, 46), LGREY, max_w=900)
    cy += 60

    # screenshot
    ss_path = os.path.join(SS, "app_dashboard.png")
    if os.path.exists(ss_path):
        cy = embed_ss(img, ss_path, cy)
    else:
        cy = screenshot_placeholder(d, cy, "[app_dashboard.png]", height=520)

    cy += 20
    cy = cx(d, "The streak keeps you honest.", cy, f(REG, 40), GREY, max_w=860)

    wmark(d)
    save(img, "post3_habits.png")


# ══════════════════════════════════════════════════════════════════════════
# POST 4 — APEX ADVISOR  "Meet your AI coach."
# ══════════════════════════════════════════════════════════════════════════
def post4():
    img, d = canvas()
    vgrad(d, (30, 10, 70), (8, 2, 20))

    cy = 200

    cy = pill(d, cy, "apex advisor", f(BOLD, 30), bg=(40, 14, 90), fg=PUR2, px=36, py=14)
    cy += 70

    cy = cx(d, "Meet your", cy, f(BOLD, 100), WHITE)
    cy += 6
    cy = cx(d, "AI coach.", cy, f(BOLD, 100), PUR2)
    cy += 50

    cy = cx(d, "Ask it anything. Get real answers.", cy, f(REG, 46), LGREY, max_w=900)
    cy += 60

    # screenshot
    ss_path = os.path.join(SS, "app_dashboard.png")
    if os.path.exists(ss_path):
        cy = embed_ss(img, ss_path, cy)
    else:
        cy = screenshot_placeholder(d, cy, "[app_dashboard.png]", height=520)

    cy += 20
    cy = cx(d, "Built into Compound. Free tier included.", cy, f(REG, 40), GREY, max_w=860)

    wmark(d)
    save(img, "post4_advisor.png")


# ══════════════════════════════════════════════════════════════════════════
# POST 5 — CTA  "Free to start. Pro coming."
# ══════════════════════════════════════════════════════════════════════════
def post5():
    img, d = canvas()
    vgrad(d, (60, 20, 140), (20, 6, 50))

    cy = 300

    # main headline
    cy = cx(d, "Free", cy, f(BOLD, 180), WHITE)
    cy = cx(d, "to start.", cy, f(BOLD, 130), PUR3)
    cy += 50

    d.rectangle([W//2-50, cy, W//2+50, cy+5], fill=(200, 160, 255))
    cy += 60

    # feature list — 4 simple lines
    items = [
        "Goals with AI action steps",
        "Habit streaks + daily todos",
        "Focus timer built in",
        "Apex Advisor — your AI coach",
    ]
    fnt = f(REG, 50)
    for item in items:
        tw = d.textlength(item, font=fnt)
        # small purple dot
        d.ellipse([W//2 - int(tw)//2 - 28, cy+14, W//2 - int(tw)//2 - 12, cy+30], fill=PUR2)
        d.text((W//2 - int(tw)//2, cy), item, font=fnt, fill=LGREY)
        cy += lh(fnt) + 4
    cy += 60

    # pro note
    cy = cx(d, "Pro plan — $10/month — coming soon", cy, f(REG, 38), (160, 120, 255), max_w=860)
    cy += 80

    # big CTA button
    btn_h = 120
    d.rounded_rectangle([80, cy, W-80, cy+btn_h], radius=30, fill=WHITE)
    ft = f(BOLD, 52)
    t  = "dailycompound.app"
    tw = d.textlength(t, font=ft)
    d.text(((W-tw)//2, cy + (btn_h - lh(ft,0))//2), t, font=ft, fill=PURPLE)

    wmark(d)
    save(img, "post5_cta.png")


# ══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("Generating Compound marketing posts...")
    post1()
    post2()
    post3()
    post4()
    post5()
    print(f"\nAll 5 saved to: {OUT}")
