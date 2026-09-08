"""Shared output paths and font lookup for the graphics/reel scripts.

Every script in this folder used to hardcode C:\\Users\\<handle>\\focus-app\\...
and C:\\Windows\\Fonts\\..., so none of them ran once the project moved to
macOS. Paths are now relative to this file, and fonts are resolved from
whichever of the known font directories exists on the machine.
"""
import os

BASE = os.path.dirname(os.path.abspath(__file__))


def path(*parts):
    """A path inside instagram_content/ — no directories are created."""
    return os.path.join(BASE, *parts)


_FONT_DIRS = [
    "/System/Library/Fonts/Supplemental",   # macOS
    "/Library/Fonts",
    os.path.expanduser("~/Library/Fonts"),
    "C:/Windows/Fonts",                     # Windows
    "/usr/share/fonts/truetype/msttcorefonts",
]


def font(*names):
    """First existing font file among `names`, searched across _FONT_DIRS."""
    for d in _FONT_DIRS:
        for n in names:
            p = os.path.join(d, n)
            if os.path.isfile(p):
                return p
    raise SystemExit(
        "Font not found: tried %s in %s" % (", ".join(names), ", ".join(_FONT_DIRS))
    )


BOLD   = font("Arial Bold.ttf", "arialbd.ttf", "Helvetica.ttc")
REG    = font("Arial.ttf", "arial.ttf", "Helvetica.ttc")
IMPACT = font("Impact.ttf", "impact.ttf", "Arial Black.ttf", "Arial Bold.ttf")
