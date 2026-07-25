"""
story_graphics.py  —  Compound build story, 8 standalone 9:16 cards.
Fixed: full-height gradients, no empty space, no emoji, no payment refs,
       stat cards with clean number/label separation, centered everything.
"""
from PIL import Image, ImageDraw, ImageFont
import os, textwrap

W, H = 1080, 1920
OUT  = r"C:\Users\klszo\focus-app\instagram_content\story"
SS   = r"C:\Users\klszo\focus-app\instagram_content\screenshots"
os.makedirs(OUT, exist_ok=True)

# ── palette ────────────────────────────────────────────────────────────────
BG      = (10,  10,  10)
PURPLE  = (124, 58,  237)
PUR2    = (167, 105, 255)
PUR3    = (210, 185, 255)
WHITE   = (255, 255, 255)
GREY    = (130, 130, 130)
LGREY   = (190, 190, 190)
MGREY   = (55,  55,  55)
DGREY   = (28,  28,  28)
GREEN   = (52,  211, 103)
GREENBG = (10,  40,  18)
RED     = (239, 68,  68)
REDBG   = (42,  8,   8)
CARD    = (48,  16,  108)

BOLD   = r"C:\Windows\Fonts\arialbd.ttf"
REG    = r"C:\Windows\Fonts\arial.ttf"
IMPACT = r"C:\Windows\Fonts\impact.ttf"

# ── helpers ────────────────────────────────────────────────────────────────
def f(path, size): return ImageFont.truetype(path, size)

def canvas():
    img = Image.new("RGB", (W, H), BG)
    return img, ImageDraw.Draw(img)

def lh(fnt, gap=14):
    """Line height for a font."""
    bb = fnt.getbbox("Ag")
    return (bb[3] - bb[1]) + gap

def cx(draw, text, y, fnt, color=WHITE, max_w=960):
    """Centered, word-wrapped text. Returns y below last line."""
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

def hdiv(draw, y, w=80, color=PURPLE):
    """Thin centered horizontal rule. Returns y+20."""
    draw.rectangle([W//2 - w//2, y, W//2 + w//2, y + 4], fill=color)
    return y + 20

def pill(draw, y, text, fnt, bg=PURPLE, fg=WHITE, px=44, py=18):
    """Centered pill badge. Returns y below badge."""
    tw = draw.textlength(text, font=fnt)
    th = lh(fnt, 0)
    x0 = W//2 - tw//2 - px
    x1 = W//2 + tw//2 + px
    y1 = y + th + py * 2
    r  = (y1 - y) // 2
    draw.rounded_rectangle([x0, y, x1, y1], radius=r, fill=bg)
    draw.text((W//2 - tw//2, y + py), text, font=fnt, fill=fg)
    return y1 + 16

def qcard(draw, y, text, fnt=None, bg=(20,10,46), border=PUR2, mx=60):
    """Auto-height quote card. Returns y below card."""
    if fnt is None: fnt = f(REG, 36)
    inner = W - mx * 2 - 36
    words = text.split()
    lines, cur = [], []
    for w in words:
        if draw.textlength(" ".join(cur + [w]), font=fnt) <= inner:
            cur.append(w)
        else:
            if cur: lines.append(" ".join(cur))
            cur = [w]
    if cur: lines.append(" ".join(cur))
    pad = 30
    h = len(lines) * lh(fnt) + pad * 2
    draw.rounded_rectangle([mx, y, W - mx, y + h], radius=14, fill=bg)
    draw.rectangle([mx, y, mx + 8, y + h], fill=border)
    ty = y + pad
    for line in lines:
        draw.text((mx + 24, ty), line, font=fnt, fill=LGREY)
        ty += lh(fnt)
    return y + h + 16

def check_row(draw, y, label, fnt=None, icon_col=GREEN):
    """Single checkmark row. Returns y below row."""
    if fnt is None: fnt = f(REG, 36)
    h = lh(fnt) + 22
    draw.rounded_rectangle([60, y, W-60, y+h], radius=10, fill=DGREY)
    draw.rectangle([60, y, 68, y+h], fill=icon_col)
    fw = f(BOLD, 28)
    draw.text((82, y + (h - lh(fw, 0))//2), "OK", font=fw, fill=icon_col)
    draw.text((124, y + (h - lh(fnt, 0))//2), label, font=fnt, fill=WHITE)
    return y + h + 8

def num_row(draw, y, num, label, fnt=None):
    """Numbered step row. Returns y below row."""
    if fnt is None: fnt = f(REG, 34)
    h = lh(fnt) + 28
    draw.rounded_rectangle([60, y, W-60, y+h], radius=12, fill=DGREY)
    draw.rounded_rectangle([60, y, 116, y+h], radius=12, fill=PURPLE)
    fn2 = f(IMPACT, 46)
    nw  = draw.textlength(num, font=fn2)
    draw.text((88 - nw//2, y + (h - lh(fn2, 0))//2), num, font=fn2, fill=WHITE)
    draw.text((130, y + (h - lh(fnt, 0))//2), label, font=fnt, fill=WHITE)
    return y + h + 10

def stats_card(draw, y, stats, bg=CARD, h=172):
    """Horizontal stat card: [(num, label), ...]. Returns y below."""
    n = len(stats)
    x0, x1 = 60, W - 60
    cw = (x1 - x0) // n
    draw.rounded_rectangle([x0, y, x1, y + h], radius=16, fill=bg)
    fn = f(IMPACT, 78)
    fl = f(REG,    28)
    for i, (num, lbl) in enumerate(stats):
        cx_pos = x0 + i * cw + cw // 2
        nw = draw.textlength(num, font=fn)
        lw = draw.textlength(lbl, font=fl)
        draw.text((cx_pos - nw//2, y + 18),       num, font=fn, fill=PUR2)
        draw.text((cx_pos - lw//2, y + h - 42),   lbl, font=fl, fill=GREY)
    for i in range(1, n):
        sx = x0 + i * cw
        draw.rectangle([sx, y + 18, sx + 2, y + h - 18], fill=MGREY)
    return y + h + 16

def two_col_tiles(draw, y, tiles, tile_h=188):
    """2-column tile grid. tiles = [(title, desc, bg_color), ...]. Returns y below."""
    tw = (W - 140) // 2
    cols = [60, 60 + tw + 20]
    for i, (title, desc, bg) in enumerate(tiles):
        col = cols[i % 2]
        ry  = y + (i // 2) * (tile_h + 12)
        draw.rounded_rectangle([col, ry, col + tw, ry + tile_h], radius=14, fill=bg)
        draw.rectangle([col, ry, col + 8, ry + tile_h], fill=PURPLE)
        ft = f(BOLD, 40)
        fd = f(REG,  30)
        draw.text((col + 22, ry + 20), title, font=ft, fill=WHITE)
        # wrap desc to tile width
        inner = tw - 44
        words = desc.split()
        lines, cur = [], []
        for w in words:
            if draw.textlength(" ".join(cur + [w]), font=fd) <= inner:
                cur.append(w)
            else:
                if cur: lines.append(" ".join(cur))
                cur = [w]
        if cur: lines.append(" ".join(cur))
        dy = ry + 74
        for line in lines:
            draw.text((col + 22, dy), line, font=fd, fill=GREY)
            dy += lh(fd)
    rows = (len(tiles) + 1) // 2
    return y + rows * (tile_h + 12) + 4

def vgrad(draw, top, bot, y0=0, y1=H):
    for i in range(y1 - y0):
        t = i / max(y1 - y0 - 1, 1)
        draw.rectangle([0, y0+i, W, y0+i+1], fill=(
            int(top[0]*(1-t) + bot[0]*t),
            int(top[1]*(1-t) + bot[1]*t),
            int(top[2]*(1-t) + bot[2]*t),
        ))

def embed_ss(img, path, y, margin=58, max_h=520):
    ss = Image.open(path).convert("RGB")
    aw = W - margin * 2
    r  = min(aw / ss.width, max_h / ss.height)
    nw, nh = int(ss.width * r), int(ss.height * r)
    ss = ss.resize((nw, nh), Image.LANCZOS)
    mask = Image.new("L", (nw, nh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, nw, nh], radius=18, fill=255)
    frame = Image.new("RGB", (nw+6, nh+6), (50, 50, 50))
    frame.paste(ss, (3, 3), mask)
    img.paste(frame, ((W - frame.width)//2, y))
    return y + frame.height + 14

def chap_header(draw, n, title):
    ft = f(BOLD, 27)
    t  = f"CHAPTER {n:02d}   ·   {title.upper()}"
    tw = draw.textlength(t, font=ft)
    draw.text(((W - tw)//2, 62), t, font=ft, fill=PUR2)
    draw.rectangle([60, 104, W-60, 106], fill=(38, 38, 38))

def wmark(draw):
    ft = f(REG, 25)
    t  = "@thestartupjournal_   |   dailycompound.app"
    tw = draw.textlength(t, font=ft)
    draw.text(((W - tw)//2, 1872), t, font=ft, fill=(52, 52, 52))

def save(img, name):
    img.save(os.path.join(OUT, name))
    print(f"  {name}")


# ══════════════════════════════════════════════════════════════════════════
# CH 01 — THE IDEA
# ══════════════════════════════════════════════════════════════════════════
def ch01():
    img, d = canvas()
    vgrad(d, (58, 14, 128), (14, 4, 38))
    chap_header(d, 1, "The Idea")

    cy = 148
    cy = cx(d, "I'M 19.", cy, f(IMPACT, 200), WHITE)
    cy += 10
    cy = cx(d, "I decided to build a SaaS.", cy, f(BOLD, 68), WHITE)
    cy += 14
    cy = hdiv(d, cy, w=100)
    cy += 14
    cy = cx(d, "Not a tutorial. Not a clone.", cy, f(REG, 46), GREY)
    cy = cx(d, "A real product. Real users.", cy, f(BOLD, 52), WHITE)
    cy += 42

    cy = qcard(d, cy,
        "Student entrepreneurs are scattered — goals in Notes, "
        "habits in spreadsheets, todos in DMs. No single system built for them.",
        f(REG, 36))
    cy += 38

    cy = cx(d, "So I built Compound.", cy, f(BOLD, 66), WHITE)
    cy = cx(d, "One app. Goals. Habits. Focus. AI.", cy, f(REG, 44), GREY)
    cy += 44

    tiles = [
        ("AI goal coach",  "Personalised action steps", (44,16,96)),
        ("Habit streaks",  "7-day sparklines",          (44,16,96)),
        ("Focus timer",    "Built right in",            (44,16,96)),
        ("Daily planner",  "AI-sorted todos",           (44,16,96)),
    ]
    cy = two_col_tiles(d, cy, tiles, tile_h=156)
    cy += 32

    cy = stats_card(d, cy, [("71","commits"),("3 wks","to ship"),("0","co-founders")])
    cy += 28

    pill(d, cy, "Series: Making Money with AI", f(BOLD, 30), bg=PURPLE)

    wmark(d)
    save(img, "chapter_01_the_idea.png")


# ══════════════════════════════════════════════════════════════════════════
# CH 02 — THE STACK
# ══════════════════════════════════════════════════════════════════════════
def ch02():
    img, d = canvas()
    vgrad(d, (22, 4, 78), (6, 2, 22))
    chap_header(d, 2, "The Stack")

    cy = 148
    cy = cx(d, "I didn't hire", cy, f(BOLD, 96), WHITE)
    cy = cx(d, "a dev team.", cy, f(BOLD, 96), WHITE)
    cy += 16
    cy = hdiv(d, cy, w=100)
    cy += 20
    cy = cx(d, "I described what I wanted.", cy, f(REG, 50), GREY)
    cy = cx(d, "The AI built it.", cy, f(BOLD, 60), PUR2)
    cy += 54

    tiles = [
        ("Claude Code", "Writes every line of code",     (46,16,98)),
        ("Supabase",    "Auth + PostgreSQL database",    (4,  36, 26)),
        ("Vercel",      "Deploy on every push",          (20, 20, 20)),
        ("GitHub",      "71 commits over 3 weeks",       (18, 18, 30)),
    ]
    cy = two_col_tiles(d, cy, tiles, tile_h=296)
    cy += 64

    cy = hdiv(d, cy, w=60, color=MGREY)
    cy += 40
    cy = cx(d, "Zero dependencies on another human.", cy, f(REG, 46), GREY)
    cy = cx(d, "Every feature: one conversation.", cy,  f(BOLD, 58), WHITE)
    cy += 68

    # Big 71 stat — number top, label bottom, no overlap
    draw_y = cy
    d.rounded_rectangle([60, draw_y, W-60, draw_y+230], radius=18, fill=CARD)
    fn_big = f(IMPACT, 138)
    fn_lbl = f(REG, 36)
    nw = d.textlength("71", font=fn_big)
    lw = d.textlength("commits shipped to production", font=fn_lbl)
    d.text(((W - nw)//2, draw_y + 18),  "71",  font=fn_big, fill=PUR2)
    d.text(((W - lw)//2, draw_y + 182), "commits shipped to production", font=fn_lbl, fill=GREY)
    cy = draw_y + 230 + 38

    pill(d, cy, "savrioX / focus-app  on  GitHub", f(BOLD, 30), bg=(22,22,22), fg=LGREY)

    wmark(d)
    save(img, "chapter_02_the_stack.png")


# ══════════════════════════════════════════════════════════════════════════
# CH 03 — AUTH + DATABASE
# ══════════════════════════════════════════════════════════════════════════
def ch03():
    img, d = canvas()
    vgrad(d, (4, 32, 68), (2, 10, 22))
    chap_header(d, 3, "Auth + Database")

    cy = 148
    cy = cx(d, "I didn't know", cy, f(BOLD, 88), WHITE)
    cy = cx(d, "how auth worked.", cy, f(BOLD, 88), WHITE)
    cy += 16
    cy = hdiv(d, cy, w=100)
    cy += 16
    cy = cx(d, "So I just described what I needed.", cy, f(REG, 46), GREY)
    cy += 44

    cy = qcard(d, cy,
        '"Build me login with Google, email magic-links, '
        'and a user profile table in Supabase."',
        f(REG, 38), bg=(18, 8, 52), border=PUR2)
    cy += 10
    cy = cx(d, "^ The exact sentence I typed.", cy, f(REG, 34), GREY)
    cy += 44

    cy = cx(d, "It shipped in one session.", cy, f(BOLD, 60), WHITE)
    cy += 12
    cy = cx(d, "What got built:", cy, f(BOLD, 36), PUR2)
    cy += 20

    items = [
        "Google OAuth sign-in",
        "Email magic-link auth",
        "User profiles table",
        "Row-level security (RLS)",
        "Session persistence",
    ]
    for item in items:
        cy = check_row(d, cy, item, f(REG, 36))

    cy += 40
    cy = hdiv(d, cy, w=60, color=MGREY)
    cy += 28
    cy = cx(d, "I didn't know what RLS was.", cy, f(REG, 44), GREY)
    cy = cx(d, "The AI explained it and set it up.", cy, f(BOLD, 50), WHITE)
    cy += 44

    stats_card(d, cy, [("5","features"),("1","session"),("0","lines by hand")])

    wmark(d)
    save(img, "chapter_03_auth_database.png")


# ══════════════════════════════════════════════════════════════════════════
# CH 04 — THE PROCESS
# ══════════════════════════════════════════════════════════════════════════
def ch04():
    img, d = canvas()
    vgrad(d, (32, 4, 90), (10, 2, 28))
    chap_header(d, 4, "The Process")

    cy = 148
    cy = cx(d, "This is how", cy,       f(BOLD, 90), WHITE)
    cy = cx(d, "every feature", cy,     f(BOLD, 90), WHITE)
    cy = cx(d, "gets built.", cy,       f(BOLD, 90), PUR2)
    cy += 16
    cy = hdiv(d, cy, w=100)
    cy += 20
    cy = cx(d, "No CS degree. No agency. No team.", cy, f(REG, 46), GREY)
    cy += 62

    steps = [
        ("1", "Describe the feature in plain English"),
        ("2", "Claude Code writes the full implementation"),
        ("3", "Review it in the browser"),
        ("4", "Push to GitHub — Vercel deploys in 30 sec"),
        ("5", "Repeat for the next feature"),
    ]
    for num, label in steps:
        cy = num_row(d, cy, num, label, f(REG, 44))

    cy += 56
    cy = hdiv(d, cy, w=60, color=MGREY)
    cy += 38
    cy = cx(d, "Every single feature in Compound", cy, f(REG, 46), GREY)
    cy = cx(d, "was built this way.", cy, f(BOLD, 58), WHITE)
    cy += 62

    d.rounded_rectangle([60, cy, W-60, cy + 220], radius=18, fill=CARD)
    fn_b = f(IMPACT, 120)
    fn_s = f(REG, 38)
    nw = d.textlength("71 features.", font=fn_b)
    sw = d.textlength("71 conversations with AI.", font=fn_s)
    d.text(((W-nw)//2, cy + 18),  "71 features.",             font=fn_b, fill=WHITE)
    d.text(((W-sw)//2, cy + 162), "71 conversations with AI.", font=fn_s, fill=GREY)
    cy += 220 + 34

    pill(d, cy, "dailycompound.app", f(BOLD, 34), bg=PURPLE)

    wmark(d)
    save(img, "chapter_04_the_process.png")


# ══════════════════════════════════════════════════════════════════════════
# CH 05 — APEX ADVISOR
# ══════════════════════════════════════════════════════════════════════════
def ch05():
    img, d = canvas()
    vgrad(d, (60, 18, 132), (18, 5, 44))
    chap_header(d, 5, "Apex Advisor")

    cy = 148
    cy = cx(d, "One sentence.", cy, f(IMPACT, 168), WHITE)
    cy += 10
    cy = cx(d, "A whole AI coach appeared.", cy, f(BOLD, 62), WHITE)
    cy += 14
    cy = hdiv(d, cy, w=100)
    cy += 18

    cy = qcard(d, cy,
        '"When the user opens the app, greet them by name, '
        'read their goals and habits, and give personalised advice."',
        f(REG, 38), bg=(22, 8, 54), border=PUR2)
    cy += 8
    cy = cx(d, "The exact sentence I typed.", cy, f(REG, 34), GREY)
    cy += 44

    cy = cx(d, "What Apex Advisor does:", cy, f(BOLD, 38), PUR2)
    cy += 18

    abilities = [
        "Greets you by name on every open",
        "Reads your active goals",
        "Checks your habit streaks",
        "Gives daily personalised advice",
        "Remembers context across sessions",
    ]
    for a in abilities:
        cy = num_row(d, cy, "->", a, f(REG, 35))

    cy += 42
    cy = hdiv(d, cy, w=60, color=MGREY)
    cy += 28
    cy = cx(d, "Built from one conversation.", cy, f(BOLD, 56), WHITE)
    cy = cx(d, "Zero debugging.", cy, f(REG, 44), GREY)
    cy += 44

    stats_card(d, cy, [("1","prompt"),("1","session"),("0","bugs on ship")])

    wmark(d)
    save(img, "chapter_05_apex_advisor.png")


# ══════════════════════════════════════════════════════════════════════════
# CH 06 — THE BROKEN DEPLOY
# ══════════════════════════════════════════════════════════════════════════
def ch06():
    img, d = canvas()
    vgrad(d, (64, 8, 8), (18, 3, 3))
    chap_header(d, 6, "The Broken Deploy")

    cy = 148
    cy = cx(d, "IT FAILED.", cy, f(IMPACT, 188), RED)
    cy += 8
    cy = hdiv(d, cy, w=160, color=RED)
    cy += 18
    cy = cx(d, "3 weeks of work.", cy,       f(BOLD, 70), WHITE)
    cy = cx(d, "Vercel wouldn't build.", cy, f(BOLD, 70), WHITE)
    cy += 40

    cy = qcard(d, cy,
        'Build Error: "npm run build" exited with 1. '
        'Missing output directory. Build configuration invalid.',
        f(REG, 34), bg=REDBG, border=RED)
    cy += 30

    cy = cx(d, "I pasted the error into Claude.", cy, f(REG, 46), GREY)
    cy = cx(d, "5 minutes later:", cy, f(BOLD, 62), WHITE)
    cy += 44

    fixes = [
        ("FIND",  "Missing outputDirectory in vercel.json"),
        ("FIX",   "Rewrote the build config, explained every change"),
        ("PUSH",  "One commit  |  build passed  |  live"),
    ]
    fn_tag = f(BOLD, 28)
    fn_det = f(REG,  33)
    for tag, detail in fixes:
        h = lh(fn_det) + 30
        d.rounded_rectangle([60, cy, W-60, cy+h], radius=12, fill=DGREY)
        d.rounded_rectangle([60, cy, 148, cy+h], radius=12, fill=PURPLE)
        tw = d.textlength(tag, font=fn_tag)
        d.text((104 - tw//2, cy + (h - lh(fn_tag, 0))//2), tag, font=fn_tag, fill=WHITE)
        d.text((162, cy + (h - lh(fn_det, 0))//2), detail, font=fn_det, fill=LGREY)
        cy += h + 10

    cy += 38
    cy = pill(d, cy, "Status: Ready   build passing", f(BOLD, 44), bg=GREENBG, fg=GREEN, px=52, py=22)
    cy += 22

    cy = cx(d, "I didn't touch a single line.", cy, f(REG, 44), GREY)
    cy = cx(d, "AI diagnosed. AI fixed. I shipped.", cy, f(BOLD, 52), WHITE)
    cy += 44

    stats_card(d, cy, [("5","minutes"),("1","commit"),("0","code touched")])

    wmark(d)
    save(img, "chapter_06_broken_deploy.png")


# ══════════════════════════════════════════════════════════════════════════
# CH 07 — GONE LIVE
# ══════════════════════════════════════════════════════════════════════════
def ch07():
    img, d = canvas()
    vgrad(d, (8, 46, 18), (3, 14, 7))
    chap_header(d, 7, "Gone Live")

    cy = 148
    cy = pill(d, cy, "Status: Ready   build passing", f(BOLD, 44), bg=GREENBG, fg=GREEN, px=52, py=22)
    cy += 16

    cy = cx(d, "dailycompound.app", cy, f(IMPACT, 96), WHITE)
    cy += 6
    cy = hdiv(d, cy, w=280, color=GREEN)
    cy += 10
    cy = cx(d, "is live.", cy, f(BOLD, 84), GREEN)
    cy += 40

    vercel = os.path.join(SS, "01_vercel_cropped.png")
    if os.path.exists(vercel):
        cy = embed_ss(img, vercel, cy, max_h=430)
    else:
        d.rounded_rectangle([60, cy, W-60, cy+200], radius=16, fill=DGREY)
        cx(d, "[Vercel dashboard screenshot]", cy+80, f(REG, 32), GREY)
        cy += 216

    cy += 16
    cy = stats_card(d, cy, [("71","commits"),("3 wks","to ship"),("$0","ad spend"),("1","founder")])
    cy += 36

    cy = cx(d, "Sign up free. Upgrade anytime.", cy, f(REG, 44), GREY)
    cy = cx(d, "Built by one person.", cy, f(BOLD, 58), WHITE)
    cy = cx(d, "Powered by AI.", cy, f(BOLD, 58), PUR2)
    cy += 44

    pill(d, cy, "Follow the build  ->  @thestartupjournal_", f(BOLD, 32), bg=PURPLE)

    wmark(d)
    save(img, "chapter_07_gone_live.png")


# ══════════════════════════════════════════════════════════════════════════
# CH 08 — THE META
# ══════════════════════════════════════════════════════════════════════════
def ch08():
    img, d = canvas()
    vgrad(d, (44, 4, 96), (14, 2, 30))
    chap_header(d, 8, "The Meta")

    cy = 148
    cy = cx(d, "The build", cy, f(BOLD, 90), WHITE)
    cy = cx(d, "documents itself.", cy, f(BOLD, 90), PUR2)
    cy += 16
    cy = hdiv(d, cy, w=100)
    cy += 20
    cy = cx(d, "I built an agent that auto-generates", cy, f(REG, 46), GREY)
    cy = cx(d, "content on every new commit.", cy, f(BOLD, 56), WHITE)
    cy += 62

    steps = [
        ("1", "Polls GitHub API every 5 minutes"),
        ("2", "New commit detected  ->  screenshot taken"),
        ("3", "Pillow generates a 9:16 hook card"),
        ("4", "Claude Haiku writes the caption"),
        ("5", "Everything packaged, ready to post"),
    ]
    for num, label in steps:
        cy = num_row(d, cy, num, label, f(REG, 44))

    cy += 56
    cy = hdiv(d, cy, w=60, color=MGREY)
    cy += 38
    cy = cx(d, "Push code.", cy, f(BOLD, 74), WHITE)
    cy = cx(d, "Content is auto-generated.", cy, f(BOLD, 58), PUR2)
    cy = cx(d, "This is what AI building looks like.", cy, f(REG, 46), GREY)
    cy += 58

    d.rounded_rectangle([60, cy, W-60, cy + 240], radius=18, fill=(20, 10, 50))
    d.rectangle([60, cy, 68, cy+240], fill=PUR2)
    cx(d, "Full series live now.", cy + 24,  f(BOLD, 44), WHITE)
    cx(d, "@thestartupjournal_",   cy + 88,  f(BOLD, 56), PUR2)
    cx(d, "dailycompound.app",     cy + 164, f(REG,  38), GREY)

    wmark(d)
    save(img, "chapter_08_the_meta.png")


# ── run all ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Generating story series...")
    ch01(); ch02(); ch03(); ch04()
    ch05(); ch06(); ch07(); ch08()
    print(f"\nDone — 8 cards in {OUT}")
