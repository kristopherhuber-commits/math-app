from gen import *

PARENT_BG = "#F4F6F8"


def parent_shell(s, active):
    s.rect(0, 0, 240, 800, T["navy"], 0)
    s.text(28, 52, "Parent area", 22, "#FFFFFF", 900)
    s.text(28, 76, "PIN unlocked · auto-locks in 10 min", 12, "#A6B8C6", 700)
    nav = ["Assignments", "Progress", "Missed questions", "Settings", "Data"]
    y = 112
    for n in nav:
        if n == active:
            s.rect(16, y, 208, 44, "#2C4A63", 12)
        s.text(36, y + 29, n, 17, "#FFFFFF" if n == active else "#C9D6E0", 800 if n == active else 700)
        y += 52
    s.rect(16, 720, 208, 48, "#2C4A63", 12)
    s.text(120, 750, "‹  Back to learner", 16, "#FFFFFF", 800, "middle")


# ---------------- 10 Parent progress dashboard ----------------
def dashboard():
    s = S(bg=PARENT_BG)
    parent_shell(s, "Progress")
    s.text(272, 60, "Progress", 30, T["ink"], 900)
    s.text(272, 88, "Last 30 days", 16, T["muted"], 700)
    # daily activity strip
    s.rect(272, 108, 976, 104, T["card"], 16, "#DDE3E8", 1.5)
    s.text(292, 136, "Minutes per day", 15, T["ink"], 800)
    import random
    random.seed(4)
    for i in range(30):
        v = random.choice([0, 0, 8, 12, 15, 18, 22, 25, 10, 14])
        h = v * 2.2
        s.rect(292 + i * 31, 196 - h, 20, max(h, 2), T["primary"] if v else "#DDE3E8", 4)
    s.note(272, 108, 1)
    # topic cards
    topics = [("Equations", 3, 6, 72, (38, 14, 6), [60, 62, 58, 66, 70, 72]),
              ("Repeating decimals", 2, 5, 64, (20, 9, 5), [50, 55, 52, 60, 62, 64]),
              ("Fractions ↔ %", 4, 5, 88, (6, 3, 1), [80, 82, 85, 84, 88, 88]),
              ("Price changes", 3, 5, 58, (18, 10, 7), [40, 45, 50, 48, 55, 58]),
              ("Number sets", 3, 5, 81, (8, 4, 1), [70, 72, 78, 80, 79, 81])]
    x, y = 272, 232
    for i, (name, lvl, mx, clean, hints, trend) in enumerate(topics):
        cx = x + (i % 3) * 330
        cy = y + (i // 3) * 262
        s.rect(cx, cy, 316, 246, T["card"], 16, "#DDE3E8", 1.5)
        s.text(cx + 20, cy + 36, name, 19, T["ink"], 900)
        s.text(cx + 20, cy + 62, f"Level {lvl} of {mx}", 14, T["muted"], 800)
        for k in range(mx):
            s.rect(cx + 120 + k * 22, cy + 52, 18, 12, T["primary"] if k < lvl else "#DDE3E8", 3)
        s.text(cx + 20, cy + 106, f"{clean}%", 34, T["ink"], 900)
        s.text(cx + 20, cy + 128, "clean solves", 13, T["muted"], 800)
        # sparkline
        pts = " ".join(f"{cx+150+j*30},{cy+124-(v-40)*1.1:.0f}" for j, v in enumerate(trend))
        s.add(f'<polyline points="{pts}" fill="none" stroke="{T["primary"]}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>')
        s.circle(cx + 150 + 5 * 30, cy + 124 - (trend[-1] - 40) * 1.1, 5, T["primary"])
        # hint usage bar
        tot = sum(hints)
        s.text(cx + 20, cy + 170, "Hints used", 13, T["muted"], 800)
        bx = cx + 20
        for v, c, lab in zip(hints, ["#8FC47F", T["turtle"], T["turtleDark"]], ["H1", "H2", "H3"]):
            w = 276 * v / tot
            s.rect(bx, cy + 180, w - 2, 16, c, 4)
            bx += w
        s.text(cx + 20, cy + 222, f"H1 {hints[0]}  ·  H2 {hints[1]}  ·  H3 {hints[2]}", 13, T["ink"], 700)
    s.note(272, 232, 2)
    # attention card
    cx, cy = 272 + 2 * 330, 232 + 262
    s.rect(cx, cy, 316, 246, "#FFF7EC", 16, T["constLine"], 1.5)
    s.text(cx + 20, cy + 36, "Worth a look", 19, T["constInk"], 900)
    for k, l in enumerate(["Price changes: reverse problems", "needed a walkthrough 4 of last 6.", "",
                           "Equations: sign errors when", "moving a term (EQ-D4) × 9 this week."]):
        s.text(cx + 20, cy + 70 + k * 26, l, 15, T["ink"], 700)
    s.text(cx + 20, cy + 222, "Open missed questions ›", 15, T["primary"], 900)
    s.note(cx, cy, 3)
    s.save("10-parent-dashboard.svg", "Parent progress dashboard")


# ---------------- 11 Parent assignment builder ----------------
def builder():
    s = S(bg=PARENT_BG)
    parent_shell(s, "Assignments")
    s.text(272, 60, "New assignment", 30, T["ink"], 900)
    s.rect(272, 88, 620, 620, T["card"], 16, "#DDE3E8", 1.5)
    s.text(296, 126, "Title (optional)", 14, T["muted"], 800)
    s.rect(296, 136, 572, 48, PARENT_BG, 10, "#C7D0D8", 1.5)
    s.text(312, 167, "Tuesday practice", 18, T["ink"], 700)
    s.text(296, 216, "Items", 14, T["muted"], 800)
    items = [("Equations", 10, "Adaptive"), ("Price changes", 5, "Level 4 (locked)"), ("Repeating decimals", 5, "Adaptive")]
    y = 228
    for name, n, lvl in items:
        s.rect(296, y, 572, 72, PARENT_BG, 12, "#C7D0D8", 1.5)
        s.text(316, y + 32, "⠿", 20, T["muted"], 900)
        s.text(344, y + 32, name, 18, T["ink"], 900)
        s.text(344, y + 56, lvl, 14, T["muted"], 700)
        # stepper
        s.rect(640, y + 16, 132, 40, T["card"], 10, "#C7D0D8", 1.5)
        s.text(662, y + 43, "−", 22, T["ink"], 900, "middle")
        s.text(706, y + 43, str(n), 19, T["ink"], 900, "middle")
        s.text(750, y + 43, "+", 22, T["ink"], 900, "middle")
        s.text(840, y + 44, "✕", 18, T["muted"], 900, "middle")
        y += 84
    s.note(296, 228, 1)
    s.rect(296, y, 572, 56, T["card"], 12, T["primary"], 2, dash="6 5")
    s.text(582, y + 35, "+ Add topic", 17, T["primary"], 900, "middle")
    y += 84
    s.text(296, y, "Question order", 14, T["muted"], 800)
    s.rect(296, y + 12, 280, 44, PARENT_BG, 22, "#C7D0D8", 1.5)
    s.rect(300, y + 16, 136, 36, T["primary"], 18)
    s.text(368, y + 40, "Grouped", 15, "#fff", 900, "middle")
    s.text(506, y + 40, "Mixed", 15, T["ink"], 800, "middle")
    s.text(600, y, "Due (optional)", 14, T["muted"], 800)
    s.rect(600, y + 12, 268, 44, PARENT_BG, 10, "#C7D0D8", 1.5)
    s.text(616, y + 41, "Tue, Sep 22", 16, T["ink"], 700)
    s.note(296, y + 12, 2)
    button(s, 296, 636, 260, 52, "Save & make active", "primary", size=18)
    button(s, 572, 636, 180, 52, "Add to queue", "secondary", size=17)
    # queue
    s.rect(916, 88, 332, 620, T["card"], 16, "#DDE3E8", 1.5)
    s.text(940, 126, "Queue", 19, T["ink"], 900)
    q = [("Monday practice", "Active · 6 / 20", T["primary"]), ("Fractions review", "Queued", T["muted"]), ("Weekend equations", "Queued", T["muted"])]
    y = 146
    for n, st, c in q:
        s.rect(940, y, 284, 72, PARENT_BG, 12)
        s.text(960, y + 32, n, 17, T["ink"], 900)
        s.text(960, y + 56, st, 14, c, 800)
        y += 84
    s.text(940, 420, "Level lock: tap an item to fix", 13, T["muted"], 700)
    s.text(940, 440, "its level; otherwise the app adapts.", 13, T["muted"], 700)
    s.note(916, 88, 3)
    s.save("11-parent-assignment-builder.svg", "Parent assignment builder and queue")


# ---------------- 12 Tablet portrait: MC question ----------------
def portrait():
    s = S(768, 1024)
    s.rect(0, 0, 768, 64, T["card"], 0)
    s.line(0, 64, 768, 64, T["line"], 2)
    s.rect(16, 12, 88, 40, T["card"], 12, T["line"], 2)
    s.text(60, 38, "‹ Home", 16, T["ink"], 800, "middle")
    s.rect(124, 26, 400, 12, T["sunken"], 6)
    s.rect(124, 26, 400 * 6 / 20, 12, T["primary"], 6)
    s.rect(560, 12, 88, 40, T["sunken"], 20)
    star(s, 582, 32, 11)
    s.text(600, 38, "21", 16, T["ink"], 800)
    s.rect(660, 12, 92, 40, T["sunken"], 20)
    shell(s, 682, 34, 0.8)
    s.text(700, 38, "128", 16, T["ink"], 800)
    s.rect(16, 84, 736, 920, T["card"], 24, T["line"], 2)
    chip(s, 40, 108, "Fractions ↔ % · Level 3", T["constBg"], T["constInk"])
    s.text(40, 180, "Write as a percent:", 24, T["ink"], 800)
    # 2 1/4
    s.text(330, 300, "2", 72, T["ink"], 500, "middle", MATH)
    frac(s, 400, 270, "1", "4", 48)
    opts = [("225%", "selected"), ("25%", "idle"), ("2.25%", "idle"), ("214%", "idle"), ("22.5%", "idle")]
    y = 380
    for i, (t, st) in enumerate(opts):
        x = 40 + (i % 2) * 352
        yy = y + (i // 2) * 128
        w = 336 if i < 4 else 688
        mc_option(s, x, yy, w, 112, st, lambda a, b, t=t: s.text(a, b + 12, t, 34, T["ink"], 800, "middle"))
    button(s, 40, 916, 200, 60, "Help", "help", icon="turtle")
    button(s, 552, 916, 176, 60, "Check", "primary", size=22)
    s.note(40, 380, 1)
    s.save("12-tablet-portrait.svg", "Tablet portrait layout: 2-column options, sticky actions")


if __name__ == "__main__":
    dashboard(); builder(); portrait()
