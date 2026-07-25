"""
compound_story_posts.py — 10 viral standalone posts for Compound
Each image: scroll-stopping hook → story context → payoff.
No series markers. No brand header. Every post works in isolation.
"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H  = 1080, 1920
OUT   = r"C:\Users\klszo\focus-app\instagram_content\compound_story"
SS    = r"C:\Users\klszo\focus-app\instagram_content\screenshots"
os.makedirs(OUT, exist_ok=True)

# ── Instagram safe zone ────────────────────────────────────────────────
# Bottom ~400px: covered by caption / username / share bar
# Right ~120px:  covered by like/comment/share buttons on Reels
# Top  ~100px:   covered by back arrow / status bar
SAFE_TOP    = 120          # content starts here
SAFE_BOTTOM = 1480         # content must end by here
SAFE_LEFT   = 80           # left margin
SAFE_RIGHT  = W - 140      # 140px right margin clears the button column
SAFE_W      = SAFE_RIGHT - SAFE_LEFT   # 860px usable width

BG     = (8,   8,   8)
PURPLE = (124, 58,  237)
PUR2   = (167, 105, 255)
PUR3   = (210, 185, 255)
WHITE  = (255, 255, 255)
GREY   = (110, 110, 110)
LGREY  = (185, 185, 185)
RED    = (239, 68,  68)
DRED   = (180, 40,  40)

BOLD = r"C:\Windows\Fonts\arialbd.ttf"
REG  = r"C:\Windows\Fonts\arial.ttf"

def f(path, size): return ImageFont.truetype(path, size)

def canvas(bg=BG):
    img = Image.new("RGB", (W, H), bg)
    return img, ImageDraw.Draw(img)

def lh(fnt, gap=16):
    bb = fnt.getbbox("Ag")
    return (bb[3] - bb[1]) + gap

def vgrad(draw, top, bot, y0=0, y1=H):
    for i in range(y1 - y0):
        t = i / max(y1 - y0 - 1, 1)
        draw.rectangle([0, y0+i, W, y0+i+1], fill=(
            int(top[0]*(1-t)+bot[0]*t),
            int(top[1]*(1-t)+bot[1]*t),
            int(top[2]*(1-t)+bot[2]*t),
        ))

def cx(draw, text, y, fnt, color=WHITE, max_w=None):
    """Centered word-wrapped text within safe zone width. Returns y below."""
    if max_w is None: max_w = SAFE_W
    words = text.split()
    lines, cur = [], []
    for w in words:
        if draw.textlength(" ".join(cur+[w]), font=fnt) <= max_w:
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

def lx(draw, text, y, fnt, color=WHITE, x=None):
    """Left-aligned text within safe zone. Returns y below."""
    if x is None: x = SAFE_LEFT
    words = text.split()
    lines, cur = [], []
    max_w = SAFE_RIGHT - x
    for w in words:
        if draw.textlength(" ".join(cur+[w]), font=fnt) <= max_w:
            cur.append(w)
        else:
            if cur: lines.append(" ".join(cur))
            cur = [w]
    if cur: lines.append(" ".join(cur))
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=color)
        y += lh(fnt)
    return y

def div(draw, y, color=PURPLE, w=60):
    draw.rectangle([W//2-w, y, W//2+w, y+4], fill=color)
    return y + 36

def wmark(draw, color=(55, 55, 55)):
    """Watermark placed just inside the safe bottom edge."""
    ft = f(REG, 26)
    t  = "dailycompound.app  ·  @thestartupjournal_"
    tw = draw.textlength(t, font=ft)
    draw.text(((W-tw)//2, SAFE_BOTTOM - lh(ft) - 10), t, font=ft, fill=color)

def embed_ss(img, path, y, max_h=None):
    """Embed screenshot respecting safe zone margins."""
    if max_h is None: max_h = 520
    ss = Image.open(path).convert("RGB")
    aw = SAFE_RIGHT - SAFE_LEFT
    r  = min(aw/ss.width, max_h/ss.height)
    nw, nh = int(ss.width*r), int(ss.height*r)
    ss = ss.resize((nw, nh), Image.LANCZOS)
    mask = Image.new("L", (nw, nh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0,0,nw,nh], radius=20, fill=255)
    border = Image.new("RGB", (nw+6, nh+6), (50,20,100))
    border.paste(ss, (3,3), mask)
    img.paste(border, ((W-border.width)//2, y))
    return y + border.height + 20

def save(img, name):
    img.save(os.path.join(OUT, name))
    print(f"  {name}")


# ══════════════════════════════════════════════════════════════════════════
# P1 — THE IDEA
# Hook: relatable problem → surprising solution → "I'm 19"
# Viral mechanic: saves + shares ("this is me")
# ══════════════════════════════════════════════════════════════════════════
def p1():
    img, d = canvas()
    vgrad(d, (22, 8, 58), (6, 2, 16))

    cy = SAFE_TOP + 60
    cy = cx(d, "I had 5 apps open", cy, f(REG, 58), LGREY)
    cy = cx(d, "just to stay productive.", cy, f(REG, 58), LGREY)
    cy += 60

    cy = cx(d, "Notion. Habit tracker.", cy, f(BOLD, 72), WHITE)
    cy = cx(d, "To-do list. ChatGPT.", cy, f(BOLD, 72), WHITE)
    cy = cx(d, "None of them talked", cy, f(BOLD, 72), LGREY)
    cy = cx(d, "to each other.", cy, f(BOLD, 72), LGREY)
    cy += 70

    cy = div(d, cy)

    cy = cx(d, "So I built one app", cy, f(BOLD, 80), PUR2)
    cy = cx(d, "that does all of it.", cy, f(BOLD, 80), PUR2)
    cy += 40

    cy = cx(d, "Goals. Habits. Tasks. An AI coach", cy, f(REG, 46), GREY)
    cy = cx(d, "that actually knows your life.", cy, f(REG, 46), GREY)
    cy += 40
    cy = cx(d, "I'm 19. I built it alone.", cy, f(BOLD, 52), WHITE)
    cy += 10
    cy = cx(d, "It's live at dailycompound.app", cy, f(REG, 46), PUR2)

    wmark(d)
    save(img, "p1_the_idea.png")


# ══════════════════════════════════════════════════════════════════════════
# P2 — THE BUILD
# ══════════════════════════════════════════════════════════════════════════
def p2():
    img, d = canvas()
    vgrad(d, (14, 6, 40), (4, 2, 12))

    cy = SAFE_TOP + 60
    cy = cx(d, "Everyone told me", cy, f(REG, 58), LGREY)
    cy = cx(d, "to learn React first.", cy, f(REG, 58), LGREY)
    cy += 70

    cy = cx(d, "I shipped a full", cy, f(BOLD, 96), WHITE)
    cy = cx(d, "SaaS app instead.", cy, f(BOLD, 96), PUR2)
    cy += 60

    cy = div(d, cy)

    cy = cx(d, "No co-founder.", cy, f(BOLD, 80), WHITE)
    cy += 8
    cy = cx(d, "No funding.", cy, f(BOLD, 80), LGREY)
    cy += 8
    cy = cx(d, "No framework.", cy, f(BOLD, 80), GREY)
    cy += 70

    cy = cx(d, "Just me, a text editor,", cy, f(REG, 50), LGREY)
    cy = cx(d, "and a blank HTML file.", cy, f(REG, 50), LGREY)
    cy += 40
    cy = cx(d, "The app is called Compound.", cy, f(BOLD, 50), PUR2)
    cy = cx(d, "It's live. I'm 19.", cy, f(BOLD, 50), WHITE)

    wmark(d)
    save(img, "p2_the_build.png")


# ══════════════════════════════════════════════════════════════════════════
# P3 — THE HARD PART
# ══════════════════════════════════════════════════════════════════════════
def p3():
    img, d = canvas()
    vgrad(d, (40, 6, 6), (10, 2, 2))

    cy = SAFE_TOP + 40
    cy = cx(d, "I spent 3 weeks", cy, f(REG, 58), (200, 100, 100))
    cy = cx(d, "building my app.", cy, f(REG, 58), (200, 100, 100))
    cy += 14
    cy = cx(d, "Then I deployed it.", cy, f(REG, 58), (180, 80, 80))
    cy += 14
    cy = cx(d, "Nothing loaded.", cy, f(BOLD, 80), WHITE)
    cy += 60

    cy = div(d, cy, RED, 50)

    cy = cx(d, "3 days debugging.", cy, f(BOLD, 110), WHITE)
    cy += 10
    cy = cx(d, "Every file.", cy, f(BOLD, 80), (255, 120, 120))
    cy = cx(d, "Every function.", cy, f(BOLD, 80), (220, 100, 100))
    cy = cx(d, "Every config.", cy, f(BOLD, 80), (190, 80, 80))
    cy += 60

    cy = div(d, cy, RED, 50)

    cy = cx(d, "One wrong line.", cy, f(BOLD, 96), WHITE)
    cy += 30
    cy = cx(d, "That's it. One line.", cy, f(REG, 54), (200, 130, 130))
    cy += 30
    cy = cx(d, "Nobody posts this part of building.", cy, f(BOLD, 48), (170, 90, 90))

    wmark(d, (100, 60, 60))
    save(img, "p3_the_hard_part.png")


# ══════════════════════════════════════════════════════════════════════════
# P4 — THE AI (APEX)
# ══════════════════════════════════════════════════════════════════════════
def p4():
    img, d = canvas()
    vgrad(d, (40, 14, 100), (12, 4, 30))

    cy = SAFE_TOP + 40
    cy = cx(d, "What if your AI coach", cy, f(REG, 56), LGREY)
    cy = cx(d, "actually knew your life?", cy, f(REG, 56), LGREY)
    cy += 14
    cy = cx(d, "Not \"Hi, how can I help\".", cy, f(BOLD, 56), GREY)
    cy += 50

    cy = cx(d, "But this:", cy, f(BOLD, 64), WHITE)
    cy += 40

    # Apex quote card — uses safe zone margins
    quote = '"You\'ve been slipping on your morning routine for 4 days. Your biggest goal is 12% done. Here\'s what you should do today."'
    mx = SAFE_LEFT
    fq = f(REG, 40)
    inner = SAFE_RIGHT - mx - 32
    words = quote.split()
    lines, cur = [], []
    for w in words:
        if d.textlength(" ".join(cur+[w]), font=fq) <= inner:
            cur.append(w)
        else:
            if cur: lines.append(" ".join(cur))
            cur = [w]
    if cur: lines.append(" ".join(cur))
    pad = 36
    qh = len(lines)*lh(fq) + pad*2
    d.rounded_rectangle([mx, cy, SAFE_RIGHT, cy+qh], radius=18, fill=(24,10,60))
    d.rectangle([mx, cy, mx+8, cy+qh], fill=PUR2)
    ty = cy + pad
    for line in lines:
        d.text((mx+28, ty), line, font=fq, fill=PUR3)
        ty += lh(fq)
    cy += qh + 50

    cy = cx(d, "It reads your goals, habits,", cy, f(REG, 48), LGREY)
    cy = cx(d, "and streaks — then coaches you.", cy, f(REG, 48), LGREY)
    cy += 30
    cy = cx(d, "It's called Apex Advisor.", cy, f(BOLD, 54), WHITE)
    cy = cx(d, "Built into Compound. $10/month.", cy, f(BOLD, 50), PUR2)

    wmark(d)
    save(img, "p4_the_ai.png")


# ══════════════════════════════════════════════════════════════════════════
# P5 — THE MOMENT IT WORKED
# ══════════════════════════════════════════════════════════════════════════
def p5():
    img, d = canvas()
    vgrad(d, (16, 6, 48), (4, 2, 14))

    cy = SAFE_TOP + 60
    cy = cx(d, "I typed three words", cy, f(REG, 58), LGREY)
    cy = cx(d, "into my app:", cy, f(REG, 58), LGREY)
    cy += 50

    cy = cx(d, '"plan my day"', cy, f(BOLD, 110), PUR2)
    cy += 60

    cy = div(d, cy)

    cy = cx(d, "It read my goals.", cy, f(REG, 56), LGREY)
    cy += 6
    cy = cx(d, "Checked which habits I'd missed.", cy, f(REG, 56), LGREY)
    cy += 6
    cy = cx(d, "Built my entire day's task list.", cy, f(REG, 56), LGREY)
    cy += 10
    cy = cx(d, "In 2 seconds.", cy, f(BOLD, 80), WHITE)
    cy += 60

    cy = div(d, cy)

    cy = cx(d, "I sat there staring at it.", cy, f(BOLD, 62), WHITE)
    cy += 20
    cy = cx(d, "I built this because nothing like it", cy, f(REG, 48), LGREY)
    cy = cx(d, "existed. It's called Compound.", cy, f(REG, 48), LGREY)
    cy = cx(d, "Free at dailycompound.app", cy, f(BOLD, 48), PUR2)

    wmark(d)
    save(img, "p5_the_moment.png")


# ══════════════════════════════════════════════════════════════════════════
# P6 — WHAT I LEARNED
# ══════════════════════════════════════════════════════════════════════════
def p6():
    img, d = canvas()
    vgrad(d, (20, 8, 52), (6, 2, 16))

    cy = SAFE_TOP + 40
    cy = cx(d, "I launched a SaaS app at 19.", cy, f(REG, 52), LGREY)
    cy = cx(d, "Here's what nobody", cy, f(BOLD, 84), WHITE)
    cy = cx(d, "tells you first:", cy, f(BOLD, 84), PUR2)
    cy += 50

    lessons = [
        ("01", "Set up your business structure before you make a dollar"),
        ("02", "Your ToS needs more than a template off Google"),
        ("03", "Vague refund policies invite chargebacks that can shut you down"),
        ("04", "You need a lawyer before you need customers"),
    ]
    fn = f(BOLD, 34)
    ft = f(REG,  40)
    for num, text in lessons:
        words = text.split()
        lines, cur = [], []
        inner = SAFE_RIGHT - 148 - 10
        for w in words:
            if d.textlength(" ".join(cur+[w]), font=ft) <= inner:
                cur.append(w)
            else:
                if cur: lines.append(" ".join(cur))
                cur = [w]
        if cur: lines.append(" ".join(cur))
        row_h = max(len(lines)*lh(ft), lh(fn)) + 30
        d.rounded_rectangle([SAFE_LEFT, cy, SAFE_RIGHT, cy+row_h], radius=12, fill=(18, 8, 44))
        d.rectangle([SAFE_LEFT, cy, SAFE_LEFT+8, cy+row_h], fill=PUR2)
        nw = d.textlength(num, font=fn)
        d.text((SAFE_LEFT+50 - int(nw)//2, cy + (row_h - lh(fn,0))//2), num, font=fn, fill=PUR2)
        ty = cy + (row_h - len(lines)*lh(ft))//2
        for line in lines:
            d.text((SAFE_LEFT+88, ty), line, font=ft, fill=LGREY)
            ty += lh(ft)
        cy += row_h + 10
    cy += 30

    cy = cx(d, "All of this figured out at 19.", cy, f(REG, 44), GREY)
    cy = cx(d, "Alone. At midnight.", cy, f(BOLD, 50), WHITE)

    wmark(d)
    save(img, "p6_what_i_learned.png")


# ══════════════════════════════════════════════════════════════════════════
# P7 — THE LAUNCH
# ══════════════════════════════════════════════════════════════════════════
def p7():
    img, d = canvas()
    vgrad(d, (60, 20, 150), (18, 6, 46))

    cy = SAFE_TOP + 60
    cy = cx(d, "I'm 19. I built this alone.", cy, f(REG, 56), PUR3)
    cy = cx(d, "It took 3 weeks.", cy, f(REG, 56), PUR3)
    cy += 50

    cy = cx(d, "Compound", cy, f(BOLD, 140), WHITE)
    cy += 10
    cy = cx(d, "is live.", cy, f(BOLD, 96), PUR2)
    cy += 50

    cy = div(d, cy, (200,160,255), 60)

    cy = cx(d, "Goals with AI action steps", cy, f(REG, 46), LGREY)
    cy += 4
    cy = cx(d, "Habit streaks that keep you honest", cy, f(REG, 46), LGREY)
    cy += 4
    cy = cx(d, "Apex Advisor — AI that knows your life", cy, f(REG, 46), LGREY)
    cy += 4
    cy = cx(d, "Focus timer built in", cy, f(REG, 46), LGREY)
    cy += 40

    cy = cx(d, "Free to start. $10/month Pro.", cy, f(BOLD, 50), WHITE)
    cy += 40

    # Anchor button within safe zone
    btn_h = 100
    btn_y = min(cy, SAFE_BOTTOM - btn_h - 60)
    d.rounded_rectangle([SAFE_LEFT, btn_y, SAFE_RIGHT, btn_y+btn_h], radius=26, fill=WHITE)
    ft = f(BOLD, 50)
    t  = "dailycompound.app"
    tw = d.textlength(t, font=ft)
    d.text(((W-tw)//2, btn_y+(btn_h-lh(ft,0))//2), t, font=ft, fill=PURPLE)

    wmark(d, (160,120,255))
    save(img, "p7_the_launch.png")


# ══════════════════════════════════════════════════════════════════════════
# P8 — APP SCREENSHOT
# ══════════════════════════════════════════════════════════════════════════
def p8():
    img, d = canvas()
    vgrad(d, (14, 4, 40), (4, 2, 12))

    cy = SAFE_TOP + 40
    cy = cx(d, "This one app replaced", cy, f(REG, 58), LGREY)
    cy = cx(d, "5 tabs on my computer.", cy, f(BOLD, 70), WHITE)
    cy += 40

    ss_path = os.path.join(SS, "app_dashboard.png")
    if os.path.exists(ss_path):
        cy = embed_ss(img, ss_path, cy, max_h=520)
    cy += 14

    cy = cx(d, "To-do  ·  Goals  ·  Habits  ·  AI coach", cy, f(REG, 42), GREY)
    cy += 16
    cy = cx(d, "Compound — free at dailycompound.app", cy, f(BOLD, 44), PUR2)

    wmark(d)
    save(img, "p8_app_screenshot.png")


# ══════════════════════════════════════════════════════════════════════════
# P9 — THE STATS
# ══════════════════════════════════════════════════════════════════════════
def p9():
    img, d = canvas()
    vgrad(d, (20, 8, 54), (6, 2, 16))

    cy = SAFE_TOP + 40
    cy = cx(d, "I built a productivity SaaS.", cy, f(REG, 54), LGREY)
    cy = cx(d, "Here are the stats:", cy, f(REG, 54), LGREY)
    cy += 60

    rows = [
        ("19", "my age"),
        ("Solo.", "no co-founder, no team"),
        ("$0", "spent on ads or tools"),
        ("Live.", "at dailycompound.app"),
    ]
    for big, small in rows:
        cy = cx(d, big, cy, f(BOLD, 120), WHITE)
        cy -= 8
        cy = cx(d, small, cy, f(REG, 46), GREY)
        cy += 20
        d.rectangle([W//2-24, cy, W//2+24, cy+3], fill=(40, 20, 80))
        cy += 32

    cy += 20
    cy = cx(d, "It's called Compound.", cy, f(BOLD, 54), PUR2)
    cy = cx(d, "Built for people who are building something.", cy, f(REG, 42), GREY)

    wmark(d)
    save(img, "p9_the_stats.png")


# ══════════════════════════════════════════════════════════════════════════
# P10 — FINAL CTA
# ══════════════════════════════════════════════════════════════════════════
def p10():
    img, d = canvas()
    vgrad(d, (56, 18, 140), (16, 4, 42))

    cy = SAFE_TOP + 50
    cy = cx(d, "A 19-year-old built an app", cy, f(REG, 54), PUR3)
    cy = cx(d, "that replaces 5 productivity tools.", cy, f(REG, 54), PUR3)
    cy += 14
    cy = cx(d, "It's completely", cy, f(BOLD, 104), WHITE)
    cy = cx(d, "free to start.", cy, f(BOLD, 104), PUR2)
    cy += 50

    cy = div(d, cy, (200,160,255), 60)

    features = [
        "Goals with AI-generated action steps",
        "Habit streaks with 7-day progress",
        "Daily task list with AI planning",
        "Apex Advisor — AI that knows your life",
        "Focus timer built in",
    ]
    ff = f(REG, 44)
    for feat in features:
        tw = int(d.textlength(feat, font=ff))
        d.ellipse([W//2-tw//2-22, cy+14, W//2-tw//2-8, cy+28], fill=PUR2)
        d.text((W//2-tw//2, cy), feat, font=ff, fill=LGREY)
        cy += lh(ff) + 4
    cy += 46

    # Anchor button within safe zone
    btn_h = 104
    btn_y = min(cy, SAFE_BOTTOM - btn_h - 60)
    d.rounded_rectangle([SAFE_LEFT, btn_y, SAFE_RIGHT, btn_y+btn_h], radius=28, fill=WHITE)
    ft = f(BOLD, 52)
    t  = "dailycompound.app"
    tw = d.textlength(t, font=ft)
    d.text(((W-tw)//2, cy+(btn_h-lh(ft,0))//2), t, font=ft, fill=PURPLE)

    wmark(d, (180,140,255))
    save(img, "p10_free_to_start.png")


if __name__ == "__main__":
    print("Generating 10 standalone Compound story posts...")
    p1(); p2(); p3(); p4(); p5()
    p6(); p7(); p8(); p9(); p10()
    print(f"\nAll 10 saved to: {OUT}")
