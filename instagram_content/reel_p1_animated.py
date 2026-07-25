"""
reel_p1_animated.py  —  Animated text-reveal Reel for P1 "The Idea"
Each block of text slides up + fades in at its own beat.
Special: divider line draws itself left-to-right.
Output: compound_reels/p1_animated.mp4  (~15s, 1080x1920, H.264)
"""
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from moviepy import VideoClip
import os

W, H = 1080, 1920
FPS  = 30
OUT  = r"C:\Users\klszo\focus-app\instagram_content\compound_reels\p1_animated.mp4"

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
BG     = (8,   8,   8)

BOLD = r"C:\Windows\Fonts\arialbd.ttf"
REG  = r"C:\Windows\Fonts\arial.ttf"

def f(path, size): return ImageFont.truetype(path, size)
def lh(fnt, gap=16):
    bb = fnt.getbbox("Ag")
    return (bb[3] - bb[1]) + gap


# ══════════════════════════════════════════════════════════════════════
# EASING
# ══════════════════════════════════════════════════════════════════════

def ease_out_cubic(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3

def ease_in_out(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


# ══════════════════════════════════════════════════════════════════════
# BACKGROUND — rendered once
# ══════════════════════════════════════════════════════════════════════

def build_bg():
    img = Image.new("RGB", (W, H), BG)
    d   = ImageDraw.Draw(img)
    for i in range(H):
        t  = i / (H - 1)
        r  = int(22 * (1-t) + 6  * t)
        g  = int(8  * (1-t) + 2  * t)
        b  = int(58 * (1-t) + 16 * t)
        d.rectangle([0, i, W, i+1], fill=(r, g, b))
    return np.array(img)

BG_ARR = build_bg()


# ══════════════════════════════════════════════════════════════════════
# PRE-RENDER EACH BEAT LAYER (RGBA, transparent background)
# ══════════════════════════════════════════════════════════════════════

def new_layer():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))

def cx_layer(img, text, y, fnt, color):
    """Draw centered wrapped text onto an RGBA layer. Returns y below."""
    d = ImageDraw.Draw(img)
    words = text.split()
    lines, cur = [], []
    for w in words:
        if d.textlength(" ".join(cur+[w]), font=fnt) <= SAFE_W:
            cur.append(w)
        else:
            if cur: lines.append(" ".join(cur))
            cur = [w]
    if cur: lines.append(" ".join(cur))
    for line in lines:
        tw = d.textlength(line, font=fnt)
        d.text(((W - tw) // 2, y), line, font=fnt, fill=color + (255,))
        y += lh(fnt)
    return y


# ── Beat 0: intro lines ────────────────────────────────────────────
b0 = new_layer()
cy = SAFE_TOP + 60
cy = cx_layer(b0, "I had 5 apps open",        cy, f(REG,  58), LGREY)
cy = cx_layer(b0, "just to stay productive.", cy, f(REG,  58), LGREY)
B0_BOTTOM = cy

# ── Beat 1: app names ──────────────────────────────────────────────
b1 = new_layer()
cy = B0_BOTTOM + 60
cy = cx_layer(b1, "Notion. Habit tracker.", cy, f(BOLD, 72), WHITE)
cy = cx_layer(b1, "To-do list. ChatGPT.",  cy, f(BOLD, 72), WHITE)
B1_BOTTOM = cy

# ── Beat 2: "none of them" ─────────────────────────────────────────
b2 = new_layer()
cy = B1_BOTTOM
cy = cx_layer(b2, "None of them talked", cy, f(BOLD, 72), LGREY)
cy = cx_layer(b2, "to each other.",      cy, f(BOLD, 72), LGREY)
B2_BOTTOM = cy

# ── Beat 3: divider — drawn dynamically (see composite loop) ───────
DIV_Y      = B2_BOTTOM + 70
DIV_X0     = W // 2 - 36
DIV_X1     = W // 2 + 36

# ── Beat 4: solution ───────────────────────────────────────────────
b4 = new_layer()
cy = DIV_Y + 36 + 20
cy = cx_layer(b4, "So I built one app",   cy, f(BOLD, 80), PUR2)
cy = cx_layer(b4, "that does all of it.", cy, f(BOLD, 80), PUR2)
B4_BOTTOM = cy

# ── Beat 5: features ───────────────────────────────────────────────
b5 = new_layer()
cy = B4_BOTTOM + 40
cy = cx_layer(b5, "Goals. Habits. Tasks. An AI coach",  cy, f(REG, 46), GREY)
cy = cx_layer(b5, "that actually knows your life.",     cy, f(REG, 46), GREY)
B5_BOTTOM = cy

# ── Beat 6: credibility ────────────────────────────────────────────
b6 = new_layer()
cy = B5_BOTTOM + 40
cy = cx_layer(b6, "I'm 19. I built it alone.", cy, f(BOLD, 52), WHITE)
B6_BOTTOM = cy

# ── Beat 7: CTA ────────────────────────────────────────────────────
b7 = new_layer()
cy = B6_BOTTOM + 10
cy = cx_layer(b7, "It's live at dailycompound.app", cy, f(REG, 46), PUR2)

# ── Watermark ─────────────────────────────────────────────────────
wm = new_layer()
ft = f(REG, 26)
d  = ImageDraw.Draw(wm)
t  = "dailycompound.app  ·  @thestartupjournal_"
tw = d.textlength(t, font=ft)
d.text(((W - tw) // 2, SAFE_BOTTOM - lh(ft) - 10), t, font=ft,
       fill=(55, 55, 55, 180))

# Convert all layers to numpy for fast compositing
def to_arr(layer): return np.array(layer).astype(np.float32)

LAYERS = [to_arr(b0), to_arr(b1), to_arr(b2),
          None,                                   # b3 = divider (dynamic)
          to_arr(b4), to_arr(b5), to_arr(b6), to_arr(b7)]
WM_ARR = to_arr(wm)


# ══════════════════════════════════════════════════════════════════════
# BEAT SCHEDULE
# (beat_index, start_t, anim_dur, slide_px)
# ══════════════════════════════════════════════════════════════════════

SLIDE_PX = 34   # pixels each block slides up from

SCHEDULE = [
    # idx  start   anim   slide
    (0,    0.4,    0.55,  SLIDE_PX),   # intro
    (1,    2.2,    0.50,  SLIDE_PX),   # app names
    (2,    4.0,    0.50,  SLIDE_PX),   # "none of them"
    (3,    5.6,    0.50,  0),          # divider (draws left→right)
    (4,    6.6,    0.55,  SLIDE_PX),   # solution
    (5,    8.8,    0.50,  SLIDE_PX),   # features
    (6,   10.8,    0.50,  SLIDE_PX),   # credibility
    (7,   12.0,    0.50,  SLIDE_PX),   # CTA
]

TOTAL = 14.0   # seconds
FADE_IN_DUR  = 0.5
FADE_OUT_DUR = 0.6


# ══════════════════════════════════════════════════════════════════════
# COMPOSITOR
# ══════════════════════════════════════════════════════════════════════

def composite(bg_f32, layer_f32, alpha, offset_y=0):
    """Blend an RGBA layer onto bg with global alpha and vertical offset."""
    if alpha <= 0:
        return bg_f32

    if offset_y > 0:                       # slide from below → shift layer UP
        shifted = np.zeros_like(layer_f32)
        shifted[:H - offset_y] = layer_f32[offset_y:]
    else:
        shifted = layer_f32

    a = (shifted[:, :, 3:4] / 255.0) * alpha
    out = bg_f32 * (1 - a) + shifted[:, :, :3] * a
    return out


def draw_divider(bg_f32, progress):
    """Draw the divider line progressing from left to right."""
    if progress <= 0:
        return bg_f32
    x_end = int(DIV_X0 + (DIV_X1 - DIV_X0) * min(1.0, progress))
    out   = bg_f32.copy()
    out[DIV_Y:DIV_Y + 4, DIV_X0:x_end] = np.array(PURPLE, dtype=np.float32)
    return out


# ══════════════════════════════════════════════════════════════════════
# FAST RENDER — pre-compute accumulated keyframes, then interpolate
# Instead of compositing 8 layers per frame, we build one image per
# beat-transition and blend only between two images per frame.
# ══════════════════════════════════════════════════════════════════════

# Build a "fully settled" image after each beat lands
# keyframes[i] = what the screen looks like once beat i is fully visible
print("Pre-computing beat keyframes...")
N_BEATS = len(SCHEDULE)

def settled_frame(up_to_beat):
    """Composite all beats 0..up_to_beat fully opaque onto background."""
    f = BG_ARR.astype(np.float32)
    f = composite(f, WM_ARR, 1.0, 0)
    for i in range(up_to_beat + 1):
        idx, start, anim, slide = SCHEDULE[i]
        if idx == 3:
            f = draw_divider(f, 1.0)
        else:
            f = composite(f, LAYERS[idx], 1.0, 0)
    return np.clip(f, 0, 255).astype(np.uint8)

# keyframes[0] = just background+watermark (before beat 0)
# keyframes[i+1] = after beat i fully settled
KF = [np.clip(composite(BG_ARR.astype(np.float32), WM_ARR, 1.0, 0), 0, 255).astype(np.uint8)]
for i in range(N_BEATS):
    KF.append(settled_frame(i))

def make_frame(t):
    # Find current beat state
    prev_kf = KF[0]
    active_idx = -1
    active_progress = 1.0
    active_slide = 0

    # Which beat are we animating right now?
    for i, (idx, start, anim, slide) in enumerate(SCHEDULE):
        elapsed = t - start
        if elapsed >= anim:
            prev_kf = KF[i + 1]  # this beat is fully settled
        elif elapsed >= 0:
            # This beat is mid-animation
            active_idx     = i
            active_progress = ease_out_cubic(elapsed / anim)
            active_slide    = slide
            break

    # Start from the last settled keyframe
    frame = prev_kf.astype(np.float32)

    # Layer in the currently-animating beat (if any)
    if active_idx >= 0:
        idx, start, anim, slide = SCHEDULE[active_idx]
        offset_y = int(active_slide * (1.0 - active_progress))
        if idx == 3:
            frame = draw_divider(frame, active_progress)
        else:
            frame = composite(frame, LAYERS[idx], active_progress, offset_y)

    # Master fade in / out
    if t < FADE_IN_DUR:
        frame *= (t / FADE_IN_DUR)
    elif t > TOTAL - FADE_OUT_DUR:
        frame *= ((TOTAL - t) / FADE_OUT_DUR)

    return np.clip(frame, 0, 255).astype(np.uint8)


# ══════════════════════════════════════════════════════════════════════
# RENDER
# ══════════════════════════════════════════════════════════════════════

print(f"Rendering P1 animated reel ({TOTAL}s @ {FPS}fps)...")

clip = VideoClip(make_frame, duration=TOTAL).with_fps(FPS)
clip.write_videofile(
    OUT,
    fps=FPS,
    codec="libx264",
    audio=False,
    preset="fast",
    ffmpeg_params=["-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart"],
    logger="bar",
)
clip.close()
print(f"\nSaved to {OUT}")
