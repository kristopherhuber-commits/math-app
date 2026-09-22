from gen import *


def tile(s, x, y, label, kind, w=None, h=64, state="normal"):
    """Term tile. kind: var | const. Variables are pill-shaped, constants square-cornered (shape cue, not just color)."""
    w = w or max(76, len(label) * 20 + 36)
    bg, ink, ln = (T["varBg"], T["varInk"], T["varLine"]) if kind == "var" else (T["constBg"], T["constInk"], T["constLine"])
    r = h / 2 if kind == "var" else 10
    dash = "6 5" if state == "ghost" else None
    op = 0.35 if state == "ghost" else 1
    s.rect(x, y + 5, w, h, ln, r, op=0.35 * op)
    s.rect(x, y, w, h, bg, r, ln, 2.5, dash=dash, op=op)
    parts = []
    # italicize variable letter
    for ch in label:
        if ch.isalpha():
            parts.append((ch, {"italic": True, "font": MATH}))
        else:
            parts.append((ch, {"font": MATH}))
    if state != "ghost":
        s.rich(x + w / 2, y + h / 2 + 11, parts, 30, "middle", MATH, 500)
    return w


# ---------------- 05 EQ tile builder ----------------
def tiles():
    s = S()
    topbar(s, "Equations", (7, 10), 16)
    # step rail
    s.rect(64, 104, 220, 600, T["card"], 24, T["line"], 2)
    s.text(88, 144, "STEPS", 14, T["muted"], 900)
    steps = [("1", "Move", "unknowns | knowns", "active"), ("2", "Simplify", "combine like terms", "todo"), ("3", "Solve", "divide both sides", "todo")]
    y = 168
    for n, name, sub, st in steps:
        fill = T["primary"] if st == "active" else T["sunken"]
        s.rect(80, y, 188, 84, T["primarySoft"] if st == "active" else T["card"], 16, T["primary"] if st == "active" else T["line"], 2)
        s.circle(108, y + 42, 16, fill)
        s.text(108, y + 48, n, 16, "#fff" if st == "active" else T["muted"], 900, "middle")
        s.text(134, y + 38, name, 19, T["ink"], 900)
        s.text(134, y + 60, sub, 13, T["muted"], 700)
        y += 96
    s.note(64, 104, 1)

    # main board
    s.rect(304, 104, 912, 600, T["card"], 24, T["line"], 2)
    chip(s, 332, 128, "Equations · Level 2")
    s.text(332, 196, "Solve for", 24, T["ink"], 800)
    s.text(446, 196, "a", 26, T["ink"], 500, font=MATH, italic=True)
    # original equation
    s.rich(760, 196, [("3", {}), ("a", {"italic": True}), (" + 3 = ", {}), ("a", {"italic": True}), (" + 23", {})], 30, "middle", MATH, 500)
    s.text(1188, 196, "given", 14, T["muted"], 800, "end")

    # two pans
    s.rect(332, 228, 400, 214, "#F1FAF9", 20, T["varLine"], 2, dash="8 6")
    s.rect(788, 228, 400, 214, "#FFF8EC", 20, T["constLine"], 2, dash="8 6")
    s.text(352, 258, "UNKNOWNS  (a terms)", 14, T["varInk"], 900)
    s.text(808, 258, "KNOWNS  (numbers)", 14, T["constInk"], 900)
    s.text(760, 352, "=", 56, T["ink"], 500, "middle", MATH)
    s.rect(716, 400, 88, 30, T["card"], 15, T["line"], 1.5)
    s.text(760, 420, "⇄ swap", 13, T["muted"], 800, "middle")
    s.note(332, 228, 2)
    # left pan tiles
    tile(s, 360, 290, "3a", "var")
    # arriving tile with sign picker
    w = tile(s, 480, 290, "?a", "var", w=110)
    s.rect(466, 368, 138, 60, T["card"], 16, T["primary"], 2.5)
    s.rect(474, 376, 58, 44, T["primarySoft"], 12)
    s.text(503, 408, "+", 30, T["varInk"], 900, "middle")
    s.rect(538, 376, 58, 44, T["primarySoft"], 12)
    s.text(567, 408, "−", 30, T["varInk"], 900, "middle")
    s.note(466, 368, 3)
    s.text(620, 404, "Which sign?", 15, T["varInk"], 800)
    # right pan tiles
    tile(s, 816, 290, "23", "const")
    tile(s, 930, 290, "−3", "const")
    s.text(935, 380, "(3 moved here: +3 → −3 ✓)", 14, T["muted"], 700)
    # ghost of where a came from
    tile(s, 1060, 290, "a", "var", state="ghost")
    s.add(f'<path d="M1080,286 C1000,210 700,200 560,286" stroke="{T["primary"]}" stroke-width="3" fill="none" stroke-dasharray="2 8" stroke-linecap="round" marker-end="url(#ah)"/>')
    s.add(f'<defs><marker id="ah" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="{T["primary"]}"/></marker></defs>')

    # balance scale explainer
    s.rect(332, 466, 856, 150, T["help"], 20)
    turtle(s, 400, 546, 0.55)
    bx = 800
    s.add(f'<polygon points="{bx-14},{600} {bx+14},{600} {bx},{548}" fill="{T["turtleDark"]}"/>')
    s.line(bx - 200, 540, bx + 200, 540, T["turtleDark"], 5)
    s.line(bx - 200, 540, bx - 200, 562, T["turtleDark"], 2)
    s.line(bx + 200, 540, bx + 200, 562, T["turtleDark"], 2)
    s.rect(bx - 290, 562, 180, 36, T["card"], 10, T["turtle"], 2)
    s.rect(bx + 110, 562, 180, 36, T["card"], 10, T["turtle"], 2)
    s.rich(bx - 200, 587, [("3", {}), ("a", {"italic": True}), (" + 3 ", {}), ("− a", {"italic": True, "fill": T["coral"]})], 20, "middle", MATH, 500)
    s.rich(bx + 200, 587, [("a", {"italic": True}), (" + 23 ", {}), ("− a", {"italic": True, "fill": T["coral"]})], 20, "middle", MATH, 500)
    s.rich(470, 510, [("Take ", {"fill": T["helpInk"]}), ("a", {"italic": True, "font": MATH, "fill": T["helpInk"]}), (" away from BOTH sides:", {"fill": T["helpInk"]})], 17, weight=900)
    s.text(470, 534, "the scale stays balanced.", 17, T["helpInk"], 700)
    s.note(332, 466, 4)

    # built equation readout + actions
    s.text(332, 668, "So far:", 16, T["muted"], 800)
    s.rich(400, 668, [("3", {}), ("a", {"italic": True}), ("  ?  ", {"fill": T["primary"]}), ("a", {"italic": True}), ("  =  23 − 3", {})], 24, font=MATH, weight=500)
    button(s, 780, 636, 180, 52, "Help", "help", icon="turtle", size=18)
    button(s, 980, 636, 208, 52, "Done moving", "disabled", size=18)
    s.save("05-equation-tile-builder.svg", "Equation tile builder, Move phase with sign choice and balance scale")


# ---------------- 06 EQ typed steps + keypad ----------------
def typed():
    s = S()
    topbar(s, "Equations", (3, 10), 7)
    s.rect(64, 104, 740, 600, T["card"], 24, T["line"], 2)
    chip(s, 92, 128, "Equations · Level 4")
    s.text(92, 196, "Solve for", 24, T["ink"], 800)
    s.text(206, 196, "y", 26, T["ink"], 500, font=MATH, italic=True)
    s.text(232, 196, "and show each step.", 24, T["ink"], 800)
    rows = [
        ([("3(", {}), ("y", {"italic": True}), (" − 2) = ", {}), ("y", {"italic": True}), (" + 8", {})], "Given", T["muted"]),
        ([("3", {}), ("y", {"italic": True}), (" − 6 = ", {}), ("y", {"italic": True}), (" + 8", {})], "Expanded ✓", T["success"]),
    ]
    y = 236
    for parts, lab, c in rows:
        s.rect(92, y, 684, 64, T["bg"], 14)
        s.rich(116, y + 43, parts, 30, font=MATH, weight=500)
        s.text(756, y + 40, lab, 16, c, 900, "end")
        y += 76
    s.note(92, 236, 1)
    # current line with error
    s.rect(92, y, 684, 72, T["card"], 14, T["primary"], 3)
    s.rich(116, y + 48, [("3", {}), ("y", {"italic": True}), (" + ", {"fill": T["amber"], "weight": 700}), ("y", {"italic": True, "fill": T["amber"]}),
                         (" = 8 + 6", {})], 30, font=MATH, weight=500)
    s.add(f'<path d="M160,{y+56} q8,6 16,0 q8,-6 16,0 q8,6 16,0" stroke="{T["amber"]}" stroke-width="2.5" fill="none"/>')
    s.rect(300, y + 18, 3, 36, T["primary"], 1)
    s.note(92, y, 2)
    fy = y + 92
    # feedback from turtle
    s.rect(92, fy, 684, 110, T["help"], 16, T["turtle"], 2)
    turtle(s, 160, fy + 60, 0.5)
    s.text(224, fy + 42, "Look at the y on the right.", 19, T["helpInk"], 900)
    s.text(224, fy + 70, "When it moved across the =, did its sign change?", 17, T["helpInk"], 700)
    s.text(224, fy + 94, "(Balance: take y away from both sides.)", 15, T["helpInk"], 700)
    s.note(92, fy, 3)
    button(s, 92, 636, 180, 52, "Help", "help", icon="turtle", size=18)

    # keypad
    s.rect(828, 104, 388, 600, T["card"], 24, T["line"], 2)
    s.text(852, 144, "KEYPAD", 14, T["muted"], 900)
    keys = [["7", "8", "9", "÷"], ["4", "5", "6", "×"], ["1", "2", "3", "−"], ["0", "y", "/", "+"], ["(", ")", "=", "⌫"]]
    ky = 164
    for row in keys:
        kx = 852
        for k in row:
            special = k in "÷×−+=/()"
            fill = T["varBg"] if k == "y" else (T["sunken"] if special or k == "⌫" else T["bg"])
            s.rect(kx, ky, 80, 64, fill, 14, T["line"], 2)
            s.add(f'<rect x="{kx}" y="{ky+58}" width="80" height="6" rx="3" fill="#000" opacity="0.06"/>')
            s.text(kx + 40, ky + 43, k, 30, T["varInk"] if k == "y" else T["ink"], 600, "middle", MATH, italic=(k == "y"))
            kx += 88
        ky += 76
    s.note(828, 164, 4)
    button(s, 852, 552, 164, 56, "Clear line", "secondary", size=18)
    button(s, 1028, 552, 164, 56, "Check step", "primary", size=19)
    s.text(1022, 648, "Physical keyboard works too:", 14, T["muted"], 700, "middle")
    s.text(1022, 672, "* → ×   - → −   Enter → Check step", 14, T["muted"], 700, "middle")
    s.save("06-equation-typed-steps.svg", "Typed equation steps with keypad and step diagnostic (EQ-D4)")


# ---------------- 07 Walkthrough (H3) RD x-method ----------------
def walkthrough():
    s = S()
    topbar(s, "Repeating decimals", (4, 20), 11)
    s.rect(64, 104, 1152, 600, T["help"], 28, T["turtle"], 2)
    turtle(s, 160, 184, 0.8, wave=True)
    s.text(250, 168, "Let's do it together", 28, T["helpInk"], 900)
    s.text(250, 198, "Walkthrough · step 4 of 6", 16, T["helpInk"], 700)
    # step dots
    for i in range(6):
        s.rect(900 + i * 48, 170, 40, 10, T["turtle"] if i < 4 else "#FFFFFF", 5, T["turtle"], 1.5)
    s.note(900, 160, 1)
    # worked card
    s.rect(96, 240, 1088, 360, T["card"], 20)
    L = [
        ("1", [("Let  ", {}), ("x", {"italic": True}), (" = 4.242424…", {})], "done"),
        ("2", [("Block 24 has 2 digits, so × 100:   100", {}), ("x", {"italic": True}), (" = 424.242424…", {})], "done"),
        ("3", [("Subtract:  100", {}), ("x", {"italic": True}), (" − ", {}), ("x", {"italic": True}), (" = 424.242424… − 4.242424…", {})], "done"),
    ]
    y = 290
    for n, parts, st in L:
        s.circle(140, y - 9, 15, T["sunken"])
        s.text(140, y - 3, n, 15, T["muted"], 900, "middle")
        s.rich(172, y, parts, 26, font=MATH, weight=500)
        y += 62
    # aligned subtraction
    s.rect(572, 444, 196, 76, "#FFF3C4", 8)
    s.text(760, 470, "424.242424…", 30, T["ink"], 500, "end", MATH)
    s.text(760, 510, "−    4.242424…", 30, T["ink"], 500, "end", MATH)
    s.line(560, 524, 770, 524, T["ink"], 2.5)
    s.text(1000, 488, "the tails line up", 16, T["helpInk"], 800, "middle")
    s.text(1000, 510, "and cancel!", 16, T["helpInk"], 800, "middle")
    s.add(f'<path d="M930,494 C880,494 840,490 790,488" stroke="{T["turtle"]}" stroke-width="2.5" fill="none" marker-end="url(#ah2)"/>'
          f'<defs><marker id="ah2" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="{T["turtle"]}"/></marker></defs>')
    # step 4 active with mini-question
    s.circle(140, 551, 15, T["primary"])
    s.text(140, 557, "4", 15, "#fff", 900, "middle")
    s.rich(172, 560, [("So  99", {}), ("x", {"italic": True}), (" = ", {}), ("?", {"fill": T["primary"], "weight": 800})], 26, font=MATH, weight=500)
    for i, v in enumerate(["420", "424", "428"]):
        s.rect(400 + i * 120, 528, 104, 50, T["primarySoft"], 12, T["primary"], 2)
        s.text(452 + i * 120, 562, v, 24, T["varInk"], 600, "middle", MATH)
    s.note(96, 530, 2)
    button(s, 96, 624, 200, 56, "‹ Back", "secondary", size=18)
    button(s, 984, 624, 200, 56, "Next ›", "disabled", size=20)
    s.text(640, 660, "Answer the mini question to continue", 15, T["helpInk"], 700, "middle")
    s.save("07-walkthrough.svg", "Hint tier H3: walkthrough of the x-method with an inline mini question")


# ---------------- 08 Correct + celebration ----------------
def celebrate():
    s = S()
    topbar(s, "Equations", (8, 10), 19)
    s.rect(64, 104, 1152, 600, T["card"], 28, T["line"], 2)
    lines = [[("3", {}), ("a", {"italic": True}), (" + 3 = ", {}), ("a", {"italic": True}), (" + 23", {})],
             [("3", {}), ("a", {"italic": True}), (" − ", {}), ("a", {"italic": True}), (" = 23 − 3", {})],
             [("2", {}), ("a", {"italic": True}), (" = 20", {})],
             [("a", {"italic": True}), (" = 10", {})]]
    labs = ["Given", "Moved ✓", "Simplified ✓", "Solved ✓"]
    y = 170
    for p, l in zip(lines, labs):
        s.rect(104, y, 520, 60, T["successSoft"] if l == "Solved ✓" else T["bg"], 14)
        s.rich(128, y + 41, p, 28, font=MATH, weight=500)
        s.text(604, y + 38, l, 15, T["success"] if "✓" in l else T["muted"], 900, "end")
        y += 72
    s.rect(104, 470, 520, 64, T["bg"], 14)
    s.text(128, 500, "Check: 3·10 + 3 = 33   and   10 + 23 = 33  ✓", 18, T["ink"], 700)
    s.text(128, 522, "Every solved equation ends with this check.", 14, T["muted"], 700)
    s.note(104, 470, 1)
    # celebration
    s.add('<circle cx="920" cy="330" r="170" fill="#FFF6D6"/>')
    for (x, y, r) in [(800, 200, 28), (920, 170, 38), (1040, 200, 28)]:
        star(s, x, y, r, T["star"], "#D19A00")
    penguin(s, 920, 360, 1.25, cheer=True)
    for (x, y, c) in [(780, 300, T["coral"]), (1060, 280, T["primary"]), (820, 420, T["star"]), (1040, 440, T["coral"]), (760, 380, T["primary"])]:
        s.rect(x, y, 12, 6, c, 2)
    s.text(920, 520, "3 stars! Brilliant!", 30, T["ink"], 900, "middle")
    s.text(920, 552, "+3 shells", 18, T["coral"], 900, "middle")
    s.note(760, 140, 2)
    button(s, 1000, 624, 176, 56, "Next ›", "primary", size=22)
    s.text(640, 740, "Celebration ≤ 1.2 s, tap anywhere to skip. Reduced motion: static stars.", 15, T["muted"], 700, "middle")
    s.save("08-correct-celebration.svg", "Correct answer: completed steps and penguin celebration")


# ---------------- 09 Assignment complete ----------------
def summary():
    s = S()
    s.rect(0, 0, 1280, 800, "#DDF1F0", 0)
    s.add('<path d="M0,560 Q320,520 640,556 T1280,540 L1280,800 L0,800 Z" fill="#F3E3C3"/>')
    s.rect(290, 80, 700, 430, T["card"], 32)
    s.text(640, 150, "Assignment done!", 40, T["ink"], 900, "middle")
    s.text(640, 186, "Monday practice · 20 questions", 18, T["muted"], 700, "middle")
    for i, x in enumerate([560, 640, 720]):
        star(s, x, 250, 34 if i == 1 else 28, T["star"], "#D19A00")
    s.text(640, 318, "51 stars   ·   +51 shells", 22, T["ink"], 900, "middle")
    rows = [("Equations", "10", "★★★ ×7   ★★ ×2   ★ ×1"), ("Percent change", "5", "★★★ ×4   ★★ ×1"), ("Repeating decimals", "5", "★★★ ×3   ★ ×2")]
    y = 350
    for n, c, st in rows:
        s.text(350, y + 24, n, 18, T["ink"], 800)
        s.text(930, y + 24, st, 16, T["muted"], 800, "end")
        y += 36
    s.note(290, 80, 1)
    s.rect(420, 540, 440, 56, T["card"], 16)
    s.text(640, 575, "New badge: 10 equations without a walkthrough", 16, T["ink"], 800, "middle")
    s.note(420, 540, 2)
    turtle(s, 300, 650, 1.1, wave=True)
    penguin(s, 1000, 620, 1.2, cheer=True)
    button(s, 510, 640, 260, 60, "Free practice  ›", "primary", size=22)
    s.text(640, 740, "Home", 18, T["varInk"], 800, "middle")
    s.save("09-assignment-complete.svg", "Assignment complete summary")


if __name__ == "__main__":
    tiles(); typed(); walkthrough(); celebrate(); summary()
