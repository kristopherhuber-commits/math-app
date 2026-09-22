"""Generate SVG mockups for docs/design/. Light theme, 1280x800 (tablet/desktop landscape)."""
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
os.makedirs(OUT, exist_ok=True)

T = dict(
    bg="#FBF7EF", card="#FFFFFF", sunken="#F3ECDD", line="#E4DACA",
    ink="#1B2B3A", muted="#51606E", primary="#0B6E6D", primarySoft="#D5EFEE",
    varBg="#D5EFEE", varInk="#0A5251", varLine="#0B6E6D",
    constBg="#FCE9CC", constInk="#7A4410", constLine="#C9832A",
    help="#E9F4E4", helpInk="#2F5E24", turtle="#5E9E4C", turtleDark="#3F7432",
    star="#F5B301", coral="#C2562B", amber="#9A4A06", amberSoft="#FDEBD3",
    success="#237A3A", successSoft="#E3F4E7", navy="#1E3448",
)
FONT = "Nunito, 'Segoe UI', system-ui, sans-serif"
MATH = "'KaTeX_Main', 'Cambria Math', 'Times New Roman', serif"


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class S:
    def __init__(self, w=1280, h=800, bg=None):
        self.w, self.h = w, h
        self.p = [f'<rect width="{w}" height="{h}" fill="{bg or T["bg"]}"/>']

    def add(self, s):
        self.p.append(s)
        return self

    def rect(self, x, y, w, h, fill, r=16, stroke=None, sw=2, dash=None, op=1):
        st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
        d = f' stroke-dasharray="{dash}"' if dash else ""
        return self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"{st}{d} opacity="{op}"/>')

    def text(self, x, y, s, size=18, fill=None, weight=600, anchor="start", font=FONT, italic=False, op=1):
        it = ' font-style="italic"' if italic else ""
        return self.add(f'<text x="{x}" y="{y}" font-family="{font}" font-size="{size}" font-weight="{weight}" '
                        f'fill="{fill or T["ink"]}" text-anchor="{anchor}"{it} opacity="{op}">{esc(s)}</text>')

    def rich(self, x, y, parts, size=18, anchor="start", font=FONT, weight=600):
        """parts: list of (text, dict(fill, italic, weight))"""
        spans = []
        for t, o in parts:
            a = ""
            if o.get("fill"): a += f' fill="{o["fill"]}"'
            if o.get("italic"): a += ' font-style="italic"'
            if o.get("weight"): a += f' font-weight="{o["weight"]}"'
            if o.get("font"): a += f' font-family="{o["font"]}"'
            spans.append(f'<tspan{a}>{esc(t)}</tspan>')
        return self.add(f'<text x="{x}" y="{y}" font-family="{font}" font-size="{size}" font-weight="{weight}" '
                        f'fill="{T["ink"]}" text-anchor="{anchor}">{"".join(spans)}</text>')

    def line(self, x1, y1, x2, y2, c=None, w=2, dash=None, cap="round"):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        return self.add(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c or T["line"]}" stroke-width="{w}" stroke-linecap="{cap}"{d}/>')

    def circle(self, cx, cy, r, fill, stroke=None, sw=2):
        st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
        return self.add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"{st}/>')

    def note(self, x, y, n, label=None):
        """Numbered annotation marker (design callout)."""
        self.circle(x, y, 13, "#7C3AED")
        self.text(x, y + 5, str(n), 14, "#FFFFFF", 800, "middle")
        return self

    def save(self, name, title):
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}" role="img">'
               f'<title>{esc(title)}</title>' + "".join(self.p) + "</svg>")
        with open(os.path.join(OUT, name), "w") as f:
            f.write(svg)


# ---------- reusable pieces ----------

def star(s, cx, cy, r, fill=None, stroke=None):
    import math
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        pts.append(f"{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}")
    st = f' stroke="{stroke}" stroke-width="2" stroke-linejoin="round"' if stroke else ""
    s.add(f'<polygon points="{" ".join(pts)}" fill="{fill or T["star"]}"{st}/>')


def shell(s, cx, cy, k=1.0):
    s.add(f'<g transform="translate({cx},{cy}) scale({k})">'
          f'<path d="M-12,8 Q-14,-10 0,-14 Q14,-10 12,8 Z" fill="#F4A98A" stroke="#C2562B" stroke-width="1.5"/>'
          f'<path d="M0,-13 L0,8 M-6,-10 L-4,8 M6,-10 L4,8" stroke="#C2562B" stroke-width="1.2" fill="none"/>'
          f'<rect x="-5" y="7" width="10" height="4" rx="2" fill="#C2562B"/></g>')


def turtle(s, x, y, k=1.0, wave=False):
    """Original simple turtle mascot. (x,y)= center of shell."""
    g = [f'<g transform="translate({x},{y}) scale({k})">']
    g.append(f'<ellipse cx="-38" cy="30" rx="14" ry="9" fill="{T["turtle"]}"/>')
    g.append(f'<ellipse cx="34" cy="32" rx="14" ry="9" fill="{T["turtle"]}"/>')
    if wave:
        g.append(f'<ellipse cx="46" cy="-18" rx="9" ry="15" transform="rotate(35 46 -18)" fill="{T["turtle"]}"/>')
    g.append(f'<ellipse cx="0" cy="8" rx="52" ry="36" fill="{T["turtleDark"]}"/>')
    g.append(f'<ellipse cx="0" cy="4" rx="46" ry="30" fill="#7DB86A"/>')
    for hx, hy in [(0, 0), (-24, 6), (24, 6), (-12, -16), (12, -16)]:
        g.append(f'<polygon points="{hx-9},{hy} {hx-4},{hy-8} {hx+4},{hy-8} {hx+9},{hy} {hx+4},{hy+8} {hx-4},{hy+8}" fill="#9CCB88" opacity="0.9"/>')
    g.append(f'<ellipse cx="0" cy="36" rx="50" ry="6" fill="#F0E2C6"/>')
    g.append(f'<circle cx="-62" cy="-2" r="22" fill="{T["turtle"]}"/>')
    g.append('<circle cx="-70" cy="-8" r="6" fill="#fff"/><circle cx="-71" cy="-7" r="3.4" fill="#1B2B3A"/>')
    g.append('<circle cx="-55" cy="-8" r="6" fill="#fff"/><circle cx="-56" cy="-7" r="3.4" fill="#1B2B3A"/>')
    g.append('<path d="M-72,6 Q-63,13 -54,6" stroke="#1B2B3A" stroke-width="2.4" fill="none" stroke-linecap="round"/>')
    g.append('<circle cx="-76" cy="2" r="3.5" fill="#F4A98A" opacity="0.8"/><circle cx="-48" cy="2" r="3.5" fill="#F4A98A" opacity="0.8"/>')
    g.append("</g>")
    s.add("".join(g))


def penguin(s, x, y, k=1.0, cheer=False):
    """Original simple penguin mascot. (x,y)=body center."""
    g = [f'<g transform="translate({x},{y}) scale({k})">']
    g.append('<ellipse cx="-16" cy="58" rx="14" ry="6" fill="#F28C38"/><ellipse cx="16" cy="58" rx="14" ry="6" fill="#F28C38"/>')
    if cheer:
        g.append(f'<ellipse cx="-44" cy="-14" rx="10" ry="26" transform="rotate(-35 -44 -14)" fill="{T["navy"]}"/>')
        g.append(f'<ellipse cx="44" cy="-14" rx="10" ry="26" transform="rotate(35 44 -14)" fill="{T["navy"]}"/>')
    else:
        g.append(f'<ellipse cx="-40" cy="14" rx="10" ry="26" transform="rotate(15 -40 14)" fill="{T["navy"]}"/>')
        g.append(f'<ellipse cx="40" cy="14" rx="10" ry="26" transform="rotate(-15 40 14)" fill="{T["navy"]}"/>')
    g.append(f'<ellipse cx="0" cy="10" rx="40" ry="50" fill="{T["navy"]}"/>')
    g.append('<ellipse cx="0" cy="20" rx="28" ry="38" fill="#FFFFFF"/>')
    g.append(f'<circle cx="0" cy="-34" r="30" fill="{T["navy"]}"/>')
    g.append('<ellipse cx="-10" cy="-32" rx="11" ry="12" fill="#fff"/><ellipse cx="10" cy="-32" rx="11" ry="12" fill="#fff"/>')
    g.append('<circle cx="-9" cy="-31" r="4" fill="#1B2B3A"/><circle cx="9" cy="-31" r="4" fill="#1B2B3A"/>')
    g.append('<circle cx="-7.5" cy="-33" r="1.4" fill="#fff"/><circle cx="10.5" cy="-33" r="1.4" fill="#fff"/>')
    g.append('<path d="M-7,-20 L7,-20 L0,-11 Z" fill="#F28C38"/>')
    g.append('<circle cx="-20" cy="-20" r="4" fill="#F4A98A" opacity="0.8"/><circle cx="20" cy="-20" r="4" fill="#F4A98A" opacity="0.8"/>')
    g.append("</g>")
    s.add("".join(g))


def button(s, x, y, w, h, label, kind="primary", icon=None, size=20):
    if kind == "primary":
        s.rect(x, y, w, h, T["primary"], 14)
        s.rect(x, y + h - 6, w, 6, "#08504F", 3, op=0.35)
        fg = "#FFFFFF"
    elif kind == "help":
        s.rect(x, y, w, h, T["help"], 14, T["turtle"], 2)
        fg = T["helpInk"]
    elif kind == "disabled":
        s.rect(x, y, w, h, T["sunken"], 14)
        fg = T["muted"]
    else:
        s.rect(x, y, w, h, T["card"], 14, T["line"], 2)
        fg = T["ink"]
    tx = x + w / 2
    if icon == "turtle":
        turtle(s, x + 38, y + h / 2 + 2, 0.28)
        tx += 18
    s.text(tx, y + h / 2 + size * 0.35, label, size, fg, 800, "middle")


def topbar(s, title, progress=None, stars=None, home=True):
    s.rect(0, 0, s.w, 72, T["card"], 0)
    s.line(0, 72, s.w, 72, T["line"], 2)
    if home:
        s.rect(24, 14, 112, 44, T["card"], 12, T["line"], 2)
        s.text(80, 43, "‹  Home", 18, T["ink"], 800, "middle")
    s.text(160 if home else 32, 44, title, 20, T["ink"], 800)
    if progress:
        done, total = progress
        x0, w = 470, 340
        s.text(x0 + w / 2, 30, f"Question {done} of {total}", 14, T["muted"], 700, "middle")
        s.rect(x0, 40, w, 12, T["sunken"], 6)
        s.rect(x0, 40, w * done / total, 12, T["primary"], 6)
    if stars is not None:
        s.rect(s.w - 260, 16, 110, 40, T["sunken"], 20)
        star(s, s.w - 234, 36, 12)
        s.text(s.w - 214, 43, str(stars), 18, T["ink"], 800)
        s.rect(s.w - 136, 16, 110, 40, T["sunken"], 20)
        shell(s, s.w - 110, 38, 0.9)
        s.text(s.w - 90, 43, "128", 18, T["ink"], 800)


def chip(s, x, y, label, fill=None, ink=None, w=None):
    w = w or (len(label) * 8.6 + 28)
    s.rect(x, y, w, 30, fill or T["primarySoft"], 15)
    s.text(x + w / 2, y + 20, label, 14, ink or T["varInk"], 800, "middle")
    return w


def frac(s, cx, y, num, den, size=40, color=None, font=MATH):
    """Stacked fraction centred at cx; y = baseline of fraction bar."""
    c = color or T["ink"]
    w = max(len(num), len(den)) * size * 0.55 + 10
    s.text(cx, y - 8, num, size, c, 500, "middle", font)
    s.line(cx - w / 2, y, cx + w / 2, y, c, 3, cap="butt")
    s.text(cx, y + size * 0.85, den, size, c, 500, "middle", font)


def mc_option(s, x, y, w, h, state, draw):
    styles = {
        "idle": (T["card"], T["line"], 2),
        "selected": (T["primarySoft"], T["primary"], 4),
        "wrong": (T["sunken"], "#B9AE9C", 2),
        "correct": (T["successSoft"], T["success"], 4),
    }
    f, st, sw = styles[state]
    s.rect(x, y, w, h, f, 18, st, sw)
    draw(x + w / 2, y + h / 2)
    if state == "wrong":
        s.rect(x, y, w, h, "#FBF7EF", 18, op=0.45)
        s.text(x + w - 18, y + 28, "✕", 18, T["amber"], 900, "end")
    if state == "selected":
        s.circle(x + w - 22, y + 22, 11, T["primary"])
        s.text(x + w - 22, y + 27, "✓", 14, "#fff", 900, "middle")
