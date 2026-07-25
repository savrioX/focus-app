from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1080, 1920
OUT  = r"C:\Users\klszo\focus-app\instagram_content"
SS   = r"C:\Users\klszo\focus-app\instagram_content\screenshots"

BG      = (10, 10, 10)
PURPLE  = (124, 58, 237)
PURPLE2 = (167, 105, 255)
WHITE   = (255, 255, 255)
GREY    = (140, 140, 140)
DGREY   = (32, 32, 32)
MGREY   = (55, 55, 55)
GREEN   = (34, 197, 94)
GREEN_BG= (15, 45, 20)

BOLD   = r"C:\Windows\Fonts\arialbd.ttf"
REG    = r"C:\Windows\Fonts\arial.ttf"
IMPACT = r"C:\Windows\Fonts\impact.ttf"

def f(path, size): return ImageFont.truetype(path, size)

def canvas():
    img = Image.new("RGB", (W, H), BG)
    return img, ImageDraw.Draw(img)

def cx(draw, text, y, fnt, color=WHITE, width=960):
    """Center text, wrap to width, return bottom y."""
    words = text.split()
    lines, cur = [], []
    for w in words:
        test = " ".join(cur + [w])
        if draw.textlength(test, font=fnt) <= width:
            cur.append(w)
        else:
            if cur: lines.append(" ".join(cur))
            cur = [w]
    if cur: lines.append(" ".join(cur))
    for line in lines:
        tw = draw.textlength(line, font=fnt)
        draw.text(((W - tw) / 2, y), line, font=fnt, fill=color)
        bb = fnt.getbbox(line)
        y += (bb[3] - bb[1]) + 16
    return y

def bar(draw, y, w=100, color=PURPLE):
    draw.rectangle([W//2 - w//2, y, W//2 + w//2, y+5], fill=color)

def pill_badge(draw, cx_pos, y, text, fnt, bg=DGREY, fg=WHITE, pad_x=36, pad_y=14):
    tw = draw.textlength(text, font=fnt)
    bb = fnt.getbbox(text)
    th = bb[3] - bb[1]
    x1 = cx_pos - tw//2 - pad_x
    y1 = y - pad_y
    x2 = cx_pos + tw//2 + pad_x
    y2 = y + th + pad_y
    draw.rounded_rectangle([x1, y1, x2, y2], radius=(y2-y1)//2, fill=bg)
    draw.text((cx_pos - tw//2, y), text, font=fnt, fill=fg)
    return y2 - y1  # height of pill

def embed(img, path, top_y, margin=56, max_h=None):
    """Embed screenshot with rounded dark frame. Returns y below frame."""
    ss = Image.open(path).convert("RGB")
    avail_w = W - margin * 2
    if max_h is None: max_h = H - top_y - 120
    ratio = min(avail_w / ss.width, max_h / ss.height)
    nw, nh = int(ss.width * ratio), int(ss.height * ratio)
    ss = ss.resize((nw, nh), Image.LANCZOS)
    mask = Image.new("L", (nw, nh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, nw, nh], radius=20, fill=255)
    bg = Image.new("RGB", (nw + 6, nh + 6), (45, 45, 45))
    bg.paste(ss, (3, 3), mask)
    x = (W - bg.width) // 2
    img.paste(bg, (x, top_y))
    return top_y + bg.height + 10

def vgrad(draw, top_color, bot_color, y0=0, y1=None):
    if y1 is None: y1 = H
    for i in range(y1 - y0):
        t = i / (y1 - y0)
        r = int(top_color[0]*(1-t) + bot_color[0]*t)
        g = int(top_color[1]*(1-t) + bot_color[1]*t)
        b = int(top_color[2]*(1-t) + bot_color[2]*t)
        draw.rectangle([0, y0+i, W, y0+i+1], fill=(r,g,b))


# ── SLIDE 1 — HOOK ───────────────────────────────────────────────────────────
def slide1():
    img, d = canvas()
    vgrad(d, (60, 20, 130), BG, y0=0, y1=680)

    # Vertically distribute content across full 1920px
    # brand tag
    pill_badge(d, W//2, 160, "THE STARTUP JOURNAL", f(BOLD,28), bg=PURPLE)

    # hero text
    cy = 280
    cy = cx(d, "I'M 19.", cy, f(IMPACT,172), WHITE)
    cy = cx(d, "I just shipped", cy+4, f(BOLD, 78), WHITE)
    cy = cx(d, "a SaaS app.", cy, f(BOLD, 78), PURPLE2)
    cy += 28
    bar(d, cy); cy += 44
    cy = cx(d, "Built almost entirely by AI.", cy, f(REG, 46), GREY)
    cy += 56

    # tech stack pills row
    stack = ["Claude Code", "Vercel", "Supabase", "Stripe"]
    cols = [(W//4)*i + W//8 for i in range(4)]
    fst = f(BOLD, 30)
    ph = pill_badge(d, cols[0], cy+18, stack[0], fst, bg=MGREY)
    for i in range(1, 4): pill_badge(d, cols[i], cy+18, stack[i], fst, bg=MGREY)
    cy += ph + 80

    # stats row
    stats = [("71", "COMMITS"), ("3", "WEEKS"), ("$10", "PRO TIER")]
    sw = W // 3
    fn = f(BOLD, 96); fl = f(REG, 32)
    for i, (num, lbl) in enumerate(stats):
        ccx = i * sw + sw // 2
        d.text((ccx - d.textlength(num, font=fn)//2, cy), num, font=fn, fill=PURPLE2)
        d.text((ccx - d.textlength(lbl, font=fl)//2, cy+106), lbl, font=fl, fill=GREY)
    for x in [sw, sw*2]:
        d.rectangle([x, cy+10, x+2, cy+120], fill=MGREY)
    cy += 188

    # divider + swipe prompt
    bar(d, cy, w=60, color=MGREY); cy += 44
    cy = cx(d, "Swipe to see the full stack  →", cy, f(REG, 40), GREY)
    cy += 60

    # bottom: repo + commit count proof
    d.rounded_rectangle([80, cy, W-80, cy+130], radius=16, fill=(22,22,22))
    d.rounded_rectangle([80, cy, W-80, cy+130], radius=16, outline=MGREY, width=1)
    frc = f(BOLD, 34); frs = f(REG, 28)
    rt = "savrioX/focus-app  ·  71 commits  ·  main"
    rs = "HTML 93%  ·  JavaScript 6%  ·  PowerShell 1%"
    d.text(((W - d.textlength(rt, font=frc))//2, cy+20), rt, font=frc, fill=WHITE)
    d.text(((W - d.textlength(rs, font=frs))//2, cy+66), rs, font=frs, fill=GREY)
    # language bar
    d.rectangle([110, cy+104, 110+int(820*0.931), cy+116], fill=(248,106,26))   # HTML orange
    d.rectangle([110+int(820*0.931), cy+104, 110+int(820*0.987), cy+116], fill=(241,224,90))  # JS yellow
    d.rectangle([110+int(820*0.987), cy+104, 930, cy+116], fill=(90,90,200))   # PS blue
    cy += 148

    cy += 50
    # "What's in the series" fill strip
    series = [
        ("EP 1-3", "Auth + DB + Stripe"),
        ("EP 4",   "AI fixes broken deploy"),
        ("EP 5",   "Feature built in 1 sentence"),
    ]
    fs2 = f(BOLD, 30); fs3 = f(REG, 28)
    for ep, desc in series:
        d.rounded_rectangle([80, cy, W-80, cy+80], radius=12, fill=(20,20,20))
        d.rectangle([80, cy, 88, cy+80], fill=PURPLE)
        d.text((110, cy+14), ep,   font=fs2, fill=PURPLE2)
        d.text((110 + int(d.textlength(ep, font=fs2)) + 24, cy+18), desc, font=fs3, fill=GREY)
        cy += 92

    cx(d, "@thestartupjournal_  ·  dailycompound.app", 1860, f(REG,28), (70,70,70))
    img.save(os.path.join(OUT,"post1_carousel","slide1_hook.png"))
    print("slide1")


# ── SLIDE 2 — VERCEL STATUS ───────────────────────────────────────────────────
def slide2():
    img, d = canvas()
    vgrad(d, (0,45,20), BG, y0=0, y1=500)

    cx(d, "DEPLOYED TO PRODUCTION", 140, f(REG,32), PURPLE2)
    bar(d, 186, w=80)
    cx(d, "Status:", 230, f(BOLD,96), WHITE)
    pill_badge(d, W//2, 378, "● Ready", f(BOLD,58), bg=GREEN_BG, fg=GREEN, pad_x=56, pad_y=20)
    cx(d, "dailycompound.app", 498, f(BOLD,48), WHITE)
    cx(d, "This took days, not months.", 572, f(REG,40), GREY)

    y = embed(img, os.path.join(SS,"01_vercel_cropped.png"), 654, max_h=840)

    # proof strip at bottom
    d.rounded_rectangle([80, y+20, W-80, y+110], radius=14, fill=(20,20,20))
    d.rounded_rectangle([80, y+20, W-80, y+110], radius=14, outline=MGREY, width=1)
    proof = "cbc0fb5  ·  fix: vercel.json build config  ·  31m ago"
    d.text(((W - d.textlength(proof, font=f(REG,30)))//2, y+44), proof, font=f(REG,30), fill=GREY)

    cx(d, "@thestartupjournal_", 1870, f(REG,28), (70,70,70))
    img.save(os.path.join(OUT,"post1_carousel","slide2_vercel.png"))
    print("slide2")


# ── SLIDE 3 — COMMITS ────────────────────────────────────────────────────────
def slide3():
    img, d = canvas()
    vgrad(d, (30,0,80), BG, y0=0, y1=460)

    cx(d, "THE CODEBASE", 160, f(REG,32), PURPLE2)
    bar(d, 206, w=70)

    cy = 240
    cy = cx(d, "71", cy, f(IMPACT,200), WHITE)
    cy = cx(d, "COMMITS", cy-20, f(BOLD,60), PURPLE2)
    cy = cx(d, "Zero co-founders.", cy+10, f(REG,42), GREY)
    cy += 30

    y = embed(img, os.path.join(SS,"02_github_commits.png"), cy, max_h=700)

    cx(d, "Every line of code:", y+30, f(REG,44), GREY)
    cx(d, "a conversation with AI.", y+90, f(BOLD,48), WHITE)

    cx(d, "@thestartupjournal_", 1870, f(REG,28), (70,70,70))
    img.save(os.path.join(OUT,"post1_carousel","slide3_commits.png"))
    print("slide3")


# ── SLIDE 4 — LIVE APP ────────────────────────────────────────────────────────
def slide4():
    img, d = canvas()
    vgrad(d, (40,10,90), BG, y0=0, y1=340)

    cx(d, "THE PRODUCT", 150, f(REG,32), PURPLE2)
    bar(d, 198, w=70)
    cy = cx(d, "This is Compound.", 240, f(BOLD,82), WHITE)
    cy += 20

    y = embed(img, os.path.join(SS,"03_live_app.png"), cy, max_h=520)
    y += 20

    features = [
        ("⚡", "Goals with AI-generated action steps"),
        ("🔥", "Habits with streaks + 7-day sparklines"),
        ("✅", "Daily todos with AI planning"),
        ("🤖", "Apex Advisor — your personal AI coach"),
        ("⏱", "Focus timer built in"),
    ]
    ff = f(REG, 34)
    for icon, text in features:
        d.rounded_rectangle([56, y, W-56, y+54], radius=10, fill=DGREY)
        d.text((86, y+10), icon, font=ff, fill=WHITE)
        d.text((136, y+10), text, font=ff, fill=WHITE)
        y += 64

    y += 16
    pill_badge(d, W//2, y+22, "Free tier  +  $10/month Pro", f(BOLD,36), bg=PURPLE, pad_x=44, pad_y=18)

    cx(d, "@thestartupjournal_", 1870, f(REG,28), (70,70,70))
    img.save(os.path.join(OUT,"post1_carousel","slide4_app.png"))
    print("slide4")


# ── SLIDE 5 — CTA ────────────────────────────────────────────────────────────
def slide5():
    img, d = canvas()
    vgrad(d, PURPLE, (18,4,48), y0=0, y1=H)

    cx(d, "FOLLOW", 220, f(IMPACT,190), WHITE)
    cx(d, "for the full build series.", 458, f(BOLD,60), WHITE)
    bar(d, 572, w=200, color=WHITE)
    cx(d, "@thestartupjournal_", 616, f(BOLD,56), WHITE)
    cx(d, "dailycompound.app", 706, f(REG,44), (218,200,255))

    # stat cards — solid dark purple bg so text is always visible
    CARD_BG  = (55, 20, 120)   # solid dark purple
    CARD_TXT = WHITE
    CARD_SUB = (210, 190, 255)
    fc = f(BOLD,40); fs = f(REG,30)
    cards = [
        ("71 commits", "shipped to production"),
        ("$10 / month", "Pro tier · live now"),
        ("1 founder", "no team · built with AI"),
    ]
    cy = 870
    for title, sub in cards:
        d.rounded_rectangle([80, cy, W-80, cy+110], radius=18, fill=CARD_BG)
        d.rectangle([80, cy, 86, cy+110], fill=PURPLE2)          # left accent stripe
        tw = d.textlength(title, font=fc)
        sw2 = d.textlength(sub, font=fs)
        d.text(((W-tw)//2, cy+18), title, font=fc, fill=CARD_TXT)
        d.text(((W-sw2)//2, cy+68), sub,   font=fs, fill=CARD_SUB)
        cy += 128

    # hashtags
    fh = f(REG,28)
    cx(d, "#makingmoneywithAI  #claudecode  #buildinpublic", 1342, fh, (180,155,255))
    cx(d, "#solofounder  #saas  #studentfounder  #aitools", 1386, fh, (180,155,255))

    bar(d, 1460, w=160, color=(255,255,255))
    cx(d, "The Startup Journal", 1500, f(REG,32), (210,190,255))
    cx(d, "Making Money with AI — series live now", 1548, f(REG,30), (170,150,220))

    img.save(os.path.join(OUT,"post1_carousel","slide5_cta.png"))
    print("slide5")


# ── POST 2 HOOK CARD ──────────────────────────────────────────────────────────
def post2_hook():
    img, d = canvas()
    vgrad(d, (70,10,10), BG, y0=0, y1=600)

    pill_badge(d, W//2, 180, "MAKING MONEY WITH AI  ·  EP. 4", f(BOLD,28), bg=(80,20,20))

    cy = 290
    cy = cx(d, "My SaaS", cy, f(BOLD,100), WHITE)
    cy = cx(d, "wasn't", cy, f(BOLD,100), WHITE)
    cy = cx(d, "deploying.", cy, f(BOLD,100), PURPLE2)
    cy += 30
    bar(d, cy, w=80); cy += 40
    cy = cx(d, "Watch how AI diagnosed", cy, f(REG,46), GREY)
    cy = cx(d, "and fixed it.", cy, f(REG,46), WHITE)
    cy += 40

    y = embed(img, os.path.join(SS,"01_vercel_cropped.png"), cy, max_h=580)

    pill_badge(d, W//2, y+52, "✓  Status: Ready", f(BOLD,48), bg=GREEN_BG, fg=GREEN, pad_x=50, pad_y=20)

    cx(d, "5 minutes. Not a single line of code", y+148, f(REG,40), GREY)
    cx(d, "touched by hand.", y+200, f(BOLD,42), WHITE)

    cx(d, "@thestartupjournal_  ·  dailycompound.app", 1860, f(REG,28), (70,70,70))
    img.save(os.path.join(OUT,"post2_reel","hook_card.png"))
    print("post2 hook")


# ── POST 3 HOOK CARD ──────────────────────────────────────────────────────────
def post3_hook():
    img, d = canvas()
    vgrad(d, (30,0,80), BG, y0=0, y1=560)

    pill_badge(d, W//2, 180, "MAKING MONEY WITH AI  ·  EP. 5", f(BOLD,28), bg=PURPLE)

    cy = 290
    cy = cx(d, "I typed", cy, f(BOLD,104), WHITE)
    cy = cx(d, "one sentence.", cy, f(BOLD,104), PURPLE2)
    cy += 20
    bar(d, cy, w=80); cy += 40
    cy = cx(d, "This entire feature appeared.", cy, f(BOLD,58), WHITE)
    cy += 50

    # Show GitHub commits as proof (more compelling than the signup page)
    y = embed(img, os.path.join(SS,"02_github_commits.png"), cy, max_h=580)

    cx(d, "Apex Advisor greets you on load.", y+30, f(REG,42), GREY)
    cx(d, "Reads your goals. Knows your streaks.", y+84, f(REG,40), GREY)
    cx(d, "Built from one conversation.", y+140, f(BOLD,46), WHITE)

    pill_badge(d, W//2, y+228, "dailycompound.app", f(BOLD,38), bg=PURPLE, pad_x=50, pad_y=20)
    cx(d, "@thestartupjournal_", 1870, f(REG,28), (70,70,70))
    img.save(os.path.join(OUT,"post3_reel","hook_card.png"))
    print("post3 hook")


# ── POST 4 SINGLE IMAGE ───────────────────────────────────────────────────────
def post4():
    img, d = canvas()
    vgrad(d, (60,20,130), BG, y0=0, y1=500)

    cx(d, "PRODUCTION.", 200, f(IMPACT,148), WHITE)
    cx(d, "READY.", 380, f(IMPACT,148), PURPLE2)
    bar(d, 570, w=280)

    y = embed(img, os.path.join(SS,"01_vercel_cropped.png"), 620, max_h=720)

    pill_badge(d, W//2, y+60, "● Status: Ready  ·  dailycompound.app", f(BOLD,36), bg=GREEN_BG, fg=GREEN, pad_x=40, pad_y=16)

    cx(d, "Built with AI. Shipped by one person.", y+148, f(BOLD,46), WHITE)
    cx(d, "Making money with AI — series live now.", y+208, f(REG,38), GREY)

    bar(d, y+286, w=60, color=MGREY)
    cx(d, "#makingmoneywithAI  #buildinpublic  #solofounder", y+310, f(REG,28), (80,80,80))

    cx(d, "@thestartupjournal_", 1870, f(REG,28), (70,70,70))
    img.save(os.path.join(OUT,"post4_single_image","post4_image.png"))
    print("post4")


if __name__ == "__main__":
    slide1(); slide2(); slide3(); slide4(); slide5()
    post2_hook(); post3_hook(); post4()
    print("\nAll done.")
