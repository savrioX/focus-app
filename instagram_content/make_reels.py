"""
make_reels.py  —  Compound story posts -> Instagram Reels
Each post = 2 scenes with Ken Burns zoom/pan + a slide-wipe transition.
Special effects: glitch on P3, light sweep on P7.
Output: 1080x1920 H.264 MP4, ~8s, ready to upload.

Usage:
  python make_reels.py            # all posts
  python make_reels.py p1 p3 p7  # specific posts
"""

import sys, os
import numpy as np
from PIL import Image, ImageFilter
from moviepy import VideoClip
from moviepy.video.fx import FadeIn, FadeOut

IN_DIR  = r"C:\Users\klszo\focus-app\instagram_content\compound_story"
OUT_DIR = r"C:\Users\klszo\focus-app\instagram_content\compound_reels"
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 1080, 1920
FPS  = 30


# ══════════════════════════════════════════════════════════════════════════
# LOW-LEVEL FRAME HELPERS
# ══════════════════════════════════════════════════════════════════════════

def load(png_path):
    return np.array(Image.open(png_path).convert("RGB").resize((W, H), Image.LANCZOS))


def zoom_pan(arr, n_frames,
             scale_start=1.0, scale_end=1.08,
             pan_y_start=0, pan_y_end=0,
             pan_x_start=0, pan_x_end=0):
    """Return list of n_frames numpy RGB arrays with Ken Burns zoom+pan."""
    frames = []
    base = Image.fromarray(arr)
    for i in range(n_frames):
        t = i / max(n_frames - 1, 1)
        scale = scale_start + (scale_end - scale_start) * t
        px    = pan_x_start  + (pan_x_end  - pan_x_start)  * t
        py    = pan_y_start  + (pan_y_end  - pan_y_start)  * t

        nw, nh = int(W * scale), int(H * scale)
        big    = base.resize((nw, nh), Image.LANCZOS)

        x0 = max(0, min(nw - W, (nw - W) // 2 + int(px)))
        y0 = max(0, min(nh - H, (nh - H) // 2 + int(py)))
        frames.append(np.array(big.crop((x0, y0, x0 + W, y0 + H))))
    return frames


def crossfade(a_frames, b_frames, n_fade):
    """Overlap-blend last n_fade frames of a into first n_fade frames of b."""
    out = list(a_frames[:-n_fade])
    for i in range(n_fade):
        t = i / n_fade
        blended = (a_frames[-(n_fade - i)] * (1 - t) +
                   b_frames[i]            *  t      ).astype(np.uint8)
        out.append(blended)
    out.extend(b_frames[n_fade:])
    return out


def wipe_slide(a_frames, b_frames, n_wipe, direction="up"):
    """Hard slide-wipe: b slides in over a.  direction = up|down|left|right."""
    out = list(a_frames[:-n_wipe])
    last_a = a_frames[-1]
    for i in range(n_wipe):
        t = (i + 1) / n_wipe
        # ease-in-out
        t = t * t * (3 - 2 * t)
        frame = last_a.copy()
        if direction == "up":
            cut = int(H * t)
            frame[H - cut:] = b_frames[i][H - cut:]
        elif direction == "down":
            cut = int(H * t)
            frame[:cut] = b_frames[i][:cut]
        elif direction == "left":
            cut = int(W * t)
            frame[:, W - cut:] = b_frames[i][:, W - cut:]
        elif direction == "right":
            cut = int(W * t)
            frame[:, :cut] = b_frames[i][:, :cut]
        out.append(frame)
    out.extend(b_frames[n_wipe:])
    return out


def fade_in_out(frames, fps, fi=0.5, fo=0.6):
    """Darken first fi*fps and last fo*fps frames."""
    frames = [f.copy() for f in frames]
    n_in  = int(fi * fps)
    n_out = int(fo * fps)
    for i in range(min(n_in, len(frames))):
        a = i / n_in
        frames[i] = (frames[i] * a).astype(np.uint8)
    for i in range(min(n_out, len(frames))):
        a = i / n_out
        j = len(frames) - 1 - i
        frames[j] = (frames[j] * a).astype(np.uint8)
    return frames


# ── Special effects ────────────────────────────────────────────────────

def glitch(frames, start_f, end_f, intensity=18):
    """Horizontal scanline displacement — tension/error vibe (for P3)."""
    out = list(frames)
    rng = np.random.default_rng(42)
    for i in range(start_f, min(end_f, len(frames))):
        f = frames[i].copy()
        n_lines = rng.integers(8, 20)
        for _ in range(n_lines):
            y   = rng.integers(0, H)
            dy  = rng.integers(2, 8)
            dx  = rng.integers(-intensity, intensity)
            y2  = min(H, y + dy)
            row = np.roll(f[y:y2], dx, axis=1)
            f[y:y2] = row
        # colour channel split on a few scanlines
        if rng.random() < 0.4:
            y = rng.integers(0, H - 4)
            shift = rng.integers(4, 12)
            f[y:y+4, :, 0] = np.roll(f[y:y+4, :, 0], shift,  axis=1)
            f[y:y+4, :, 2] = np.roll(f[y:y+4, :, 2], -shift, axis=1)
        out[i] = f
    return out


def light_sweep(frames, start_f, end_f, color=(167, 105, 255), width=160):
    """Diagonal light streak sweeping across — celebration vibe (for P7)."""
    out = list(frames)
    n   = end_f - start_f
    for idx, i in enumerate(range(start_f, min(end_f, len(frames)))):
        f = frames[i].copy().astype(np.float32)
        t = idx / max(n - 1, 1)
        # sweep position: diagonal from top-left to bottom-right
        cx = int((W + H) * t) - H
        for y in range(H):
            x_centre = cx + y
            x0 = max(0, x_centre - width // 2)
            x1 = min(W, x_centre + width // 2)
            if x1 <= x0:
                continue
            xs = np.arange(x0, x1)
            dist = np.abs(xs - x_centre) / (width / 2)
            alpha = (1 - dist) * 0.22  # max 22% opacity
            for c, cv in enumerate(color):
                f[y, x0:x1, c] = np.clip(
                    f[y, x0:x1, c] * (1 - alpha) + cv * alpha, 0, 255
                )
        out[i] = f.astype(np.uint8)
    return out


# ══════════════════════════════════════════════════════════════════════════
# PER-POST SCENE CONFIGS
# Each entry: list of scene dicts + transition type
# scene keys: dur (s), scale_start, scale_end, pan_y_start, pan_y_end,
#             pan_x_start, pan_x_end
# ══════════════════════════════════════════════════════════════════════════

CONFIGS = {
    # P1 — zoom in top half, wipe up, zoom out from bottom
    "p1": dict(transition="wipe_up", scenes=[
        dict(dur=4.0, scale_start=1.0,  scale_end=1.07, pan_y_start=0,   pan_y_end=-40),
        dict(dur=4.5, scale_start=1.07, scale_end=1.0,  pan_y_start=40,  pan_y_end=0),
    ]),
    # P2 — left wipe, two angles
    "p2": dict(transition="wipe_left", scenes=[
        dict(dur=4.0, scale_start=1.0,  scale_end=1.08, pan_y_start=0,   pan_y_end=-50),
        dict(dur=4.5, scale_start=1.08, scale_end=1.0,  pan_y_start=-50, pan_y_end=0),
    ]),
    # P3 — glitch effect + red crossfade
    "p3": dict(transition="crossfade", fx="glitch", scenes=[
        dict(dur=4.2, scale_start=1.0,  scale_end=1.06, pan_y_start=0,   pan_y_end=-30),
        dict(dur=4.3, scale_start=1.06, scale_end=1.0,  pan_y_start=-30, pan_y_end=0),
    ]),
    # P4 — slow upward pan revealing the Apex quote card
    "p4": dict(transition="wipe_up", scenes=[
        dict(dur=3.5, scale_start=1.0,  scale_end=1.05, pan_y_start=60,  pan_y_end=0),
        dict(dur=5.0, scale_start=1.05, scale_end=1.0,  pan_y_start=0,   pan_y_end=-60),
    ]),
    # P5 — gentle push up
    "p5": dict(transition="wipe_up", scenes=[
        dict(dur=4.0, scale_start=1.0,  scale_end=1.06, pan_y_start=0,   pan_y_end=-50),
        dict(dur=4.5, scale_start=1.06, scale_end=1.0,  pan_y_start=-50, pan_y_end=0),
    ]),
    # P6 — right wipe, the list slides in
    "p6": dict(transition="wipe_right", scenes=[
        dict(dur=3.5, scale_start=1.0,  scale_end=1.05, pan_y_start=0,   pan_y_end=-40),
        dict(dur=5.0, scale_start=1.05, scale_end=1.0,  pan_y_start=-40, pan_y_end=0),
    ]),
    # P7 — light sweep + down wipe (launch energy)
    "p7": dict(transition="wipe_down", fx="sweep", scenes=[
        dict(dur=4.0, scale_start=1.0,  scale_end=1.06, pan_y_start=0,   pan_y_end=-30),
        dict(dur=4.5, scale_start=1.06, scale_end=1.0,  pan_y_start=-30, pan_y_end=0),
    ]),
    # P8 — pan up slowly over the screenshot
    "p8": dict(transition="crossfade", scenes=[
        dict(dur=4.0, scale_start=1.0,  scale_end=1.05, pan_y_start=80,  pan_y_end=0),
        dict(dur=4.5, scale_start=1.05, scale_end=1.0,  pan_y_start=0,   pan_y_end=-80),
    ]),
    # P9 — stats punch: zoom in tight then release
    "p9": dict(transition="crossfade", scenes=[
        dict(dur=3.5, scale_start=1.0,  scale_end=1.10, pan_y_start=0,   pan_y_end=-40),
        dict(dur=5.0, scale_start=1.10, scale_end=1.0,  pan_y_start=-40, pan_y_end=0),
    ]),
    # P10 — sweep + wipe left (CTA energy)
    "p10": dict(transition="wipe_left", fx="sweep", scenes=[
        dict(dur=4.0, scale_start=1.0,  scale_end=1.06, pan_y_start=0,   pan_y_end=-40),
        dict(dur=4.5, scale_start=1.06, scale_end=1.0,  pan_y_start=-40, pan_y_end=0),
    ]),
}


# ══════════════════════════════════════════════════════════════════════════
# MAIN REEL BUILDER
# ══════════════════════════════════════════════════════════════════════════

TRANS_FRAMES = int(0.45 * FPS)   # 0.45s transition

def build_reel(arr, cfg):
    scenes_frames = []
    for sc in cfg["scenes"]:
        n = int(sc["dur"] * FPS)
        f = zoom_pan(
            arr, n,
            scale_start = sc["scale_start"],
            scale_end   = sc["scale_end"],
            pan_y_start = sc.get("pan_y_start", 0),
            pan_y_end   = sc.get("pan_y_end",   0),
            pan_x_start = sc.get("pan_x_start", 0),
            pan_x_end   = sc.get("pan_x_end",   0),
        )
        scenes_frames.append(f)

    # Join scenes with chosen transition
    trans = cfg.get("transition", "crossfade")
    all_frames = scenes_frames[0]
    for nxt in scenes_frames[1:]:
        if trans == "crossfade":
            all_frames = crossfade(all_frames, nxt, TRANS_FRAMES)
        elif trans == "wipe_up":
            all_frames = wipe_slide(all_frames, nxt, TRANS_FRAMES, "up")
        elif trans == "wipe_down":
            all_frames = wipe_slide(all_frames, nxt, TRANS_FRAMES, "down")
        elif trans == "wipe_left":
            all_frames = wipe_slide(all_frames, nxt, TRANS_FRAMES, "left")
        elif trans == "wipe_right":
            all_frames = wipe_slide(all_frames, nxt, TRANS_FRAMES, "right")

    # Special FX
    fx = cfg.get("fx")
    n  = len(all_frames)
    if fx == "glitch":
        # glitch bursts at 20-35% and 55-70% through the video
        s1, e1 = int(n * 0.20), int(n * 0.36)
        s2, e2 = int(n * 0.55), int(n * 0.70)
        all_frames = glitch(all_frames, s1, e1, intensity=20)
        all_frames = glitch(all_frames, s2, e2, intensity=14)
    elif fx == "sweep":
        # light sweep across the full middle section
        s, e = int(n * 0.15), int(n * 0.55)
        all_frames = light_sweep(all_frames, s, e)

    # Fade in/out
    all_frames = fade_in_out(all_frames, FPS, fi=0.5, fo=0.6)
    return all_frames


def write_mp4(frames, out_path):
    arr = np.stack(frames)       # (N, H, W, 3)
    def make_frame(t):
        i = min(int(t * FPS), len(arr) - 1)
        return arr[i]
    duration = len(frames) / FPS
    clip = (
        VideoClip(make_frame, duration=duration)
        .with_fps(FPS)
    )
    clip.write_videofile(
        out_path,
        fps=FPS,
        codec="libx264",
        audio=False,
        preset="fast",
        ffmpeg_params=["-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart"],
        logger=None,
    )
    clip.close()


# ══════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════

all_posts = sorted([f for f in os.listdir(IN_DIR) if f.endswith(".png")])

if len(sys.argv) > 1:
    filters = [a.lower().rstrip("_") for a in sys.argv[1:]]
    def matches(fname):
        fl = fname.lower()
        return any(fl.startswith(flt + "_") or fl == flt + ".png" for flt in filters)
    posts = [p for p in all_posts if matches(p)]
else:
    posts = all_posts

if not posts:
    print("No matching PNGs found.")
    sys.exit(1)

print(f"Building {len(posts)} reel(s)...\n")
for post in posts:
    key = post.split("_")[0]        # "p1", "p2", etc.
    cfg = CONFIGS.get(key, CONFIGS["p1"])
    png = os.path.join(IN_DIR,  post)
    mp4 = os.path.join(OUT_DIR, post.replace(".png", ".mp4"))

    print(f"  {post} ({cfg.get('transition','crossfade')}"
          + (f" + {cfg['fx']}" if "fx" in cfg else "") + ")")

    arr    = load(png)
    frames = build_reel(arr, cfg)
    write_mp4(frames, mp4)

print(f"\nDone. {len(posts)} reel(s) saved to {OUT_DIR}")
