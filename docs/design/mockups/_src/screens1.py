from gen import *


# ---------------- 01 Home ----------------
def home():
    s = S()
    # header
    s.text(64, 84, "Hi there!", 40, T["ink"], 900)
    s.text(64, 118, "Ready for today's practice?", 20, T["muted"], 600)
    # streak + stars
    s.rect(820, 52, 190, 64, T["card"], 20, T["line"], 2)
    s.add(f'<path d="M846,96 q12,-26 24,0 q12,-26 24,0" stroke="{T["primary"]}" stroke-width="4" fill="none" stroke-linecap="round"/>')
    s.text(906, 80, "5 days", 22, T["ink"], 900)
    s.text(906, 102, "streak", 14, T["muted"], 700)
    s.rect(1026, 52, 190, 64, T["card"], 20, T["line"], 2)
    shell(s, 1062, 86, 1.3)
    s.text(1088, 80, "128", 22, T["ink"], 900)
    s.text(1088, 102, "shells", 14, T["muted"], 700)
    s.note(806, 52, 1)

    # assignment card
    s.rect(64, 148, 720, 372, T["card"], 24, T["line"], 2)
    s.text(96, 196, "TODAY'S ASSIGNMENT", 14, T["primary"], 900)
    s.text(96, 232, "Monday practice", 28, T["ink"], 900)
    items = [("Equations", 10, 6, "var"), ("Percent change", 5, 0, "const"), ("Repeating decimals", 5, 0, "var")]
    y = 262
    for name, n, d, kind in items:
        s.rect(96, y, 656, 52, T["bg"], 14)
        s.text(116, y + 33, name, 19, T["ink"], 800)
        s.text(460, y + 33, f"{d} / {n}", 17, T["muted"], 700, "end")
        s.rect(480, y + 20, 200, 12, T["sunken"], 6)
        if d:
            s.rect(480, y + 20, 200 * d / n, 12, T["primary"], 6)
        if d == n:
            s.text(720, y + 34, "✓", 20, T["success"], 900, "middle")
        y += 58
    button(s, 96, 446, 300, 52, "Keep going  ›", "primary", size=22)
    s.text(420, 478, "6 of 20 done", 16, T["muted"], 700)
    s.note(64, 148, 2)

    # mascots panel
    s.rect(808, 148, 408, 372, "#DDF1F0", 24)
    s.add('<path d="M808,400 Q900,380 1010,398 T1216,392 L1216,496 Q1216,520 1192,520 L832,520 Q808,520 808,496 Z" fill="#F3E3C3"/>')
    s.add('<path d="M808,392 Q900,372 1010,390 T1216,384" stroke="#FFFFFF" stroke-width="5" fill="none" opacity="0.8"/>')
    turtle(s, 940, 430, 0.95)
    penguin(s, 1110, 390, 0.95)
    for i, (sx, sy) in enumerate([(860, 486), (890, 494), (1030, 490), (1180, 492)]):
        shell(s, sx, sy, 0.7)
    # speech bubble
    s.rect(836, 176, 352, 88, T["card"], 18)
    s.add('<path d="M1080,262 L1100,286 L1106,262 Z" fill="#FFFFFF"/>')
    s.text(858, 212, "Pip: Equations today? Let's go!", 18, T["ink"], 800)
    s.text(858, 240, "Shelly's here if you get stuck.", 16, T["muted"], 700)
    s.note(808, 148, 3)

    # free practice
    s.text(64, 576, "Free practice", 22, T["ink"], 900)
    s.text(232, 576, "unlocks when today's assignment is done", 16, T["muted"], 700)
    topics = [("Number sets", "ℕ ℤ ℚ ℝ"), ("Repeating decimals", "0.1̅6̅"), ("Fractions ↔ %", "¾ = 75%"),
              ("Price changes", "+10%"), ("Equations", "3a + 3 = 23")]
    x = 64
    for name, glyph in topics:
        s.rect(x, 596, 216, 136, T["card"], 20, T["line"], 2)
        s.text(x + 108, 658, glyph, 28, T["varInk"], 700, "middle", MATH)
        s.text(x + 108, 704, name, 17, T["ink"], 800, "middle")
        s.rect(x, 596, 216, 136, T["bg"], 20, op=0.55)
        s.add(f'<g transform="translate({x+188},{616})"><rect x="-9" y="0" width="18" height="14" rx="3" fill="{T["muted"]}"/>'
              f'<path d="M-5,0 v-5 a5,5 0 0 1 10,0 v5" stroke="{T["muted"]}" stroke-width="2.5" fill="none"/></g>')
        x += 234
    s.note(64, 596, 4)
    s.text(1216, 772, "Parent", 16, T["muted"], 800, "end")
    s.line(1160, 778, 1216, 778, T["muted"], 1.5)
    s.note(1140, 766, 5)
    s.save("01-home.svg", "Home, learner view")


# ---------------- 02 MC question (RD, D->F) ----------------
def mc_question():
    s = S()
    topbar(s, "Repeating decimals", (4, 20), 11)
    s.rect(64, 104, 1152, 600, T["card"], 28, T["line"], 2)
    chip(s, 104, 136, "Repeating decimals · Level 3")
    s.text(104, 214, "Write this as a fraction in lowest terms:", 26, T["ink"], 800)
    # the number
    s.text(640, 318, "4.242424…", 64, T["ink"], 500, "middle", MATH)
    s.text(640, 360, "=", 30, T["muted"], 500, "middle", MATH)
    s.text(640, 410, "4.24", 44, T["ink"], 500, "middle", MATH)
    s.line(634, 372, 680, 372, T["ink"], 3, cap="butt")
    s.text(640, 440, "the block 24 repeats forever", 16, T["muted"], 700, "middle")
    s.note(470, 300, 1)
    # options
    opts = [("140", "33", "selected"), ("424", "99", "idle"), ("106", "25", "idle"), ("8", "33", "idle"), ("140", "3", "idle")]
    x = 104
    for n, d, st in opts:
        mc_option(s, x, 470, 196, 136, st, lambda cx, cy, n=n, d=d: frac(s, cx, cy + 4, n, d, 38))
        x += 214
    s.note(104, 470, 2)
    button(s, 104, 628, 200, 56, "Help", "help", icon="turtle")
    button(s, 1000, 628, 176, 56, "Check", "primary", size=22)
    s.note(104, 628, 3)
    s.note(1000, 628, 4)
    s.text(640, 740, "Tap an answer, then Check. Keyboard: 1–5 to choose, Enter to check.", 15, T["muted"], 700, "middle")
    s.save("02-question-multiple-choice.svg", "Multiple-choice question: repeating decimal to fraction")


# ---------------- 03 Wrong answer + turtle hint drawer (PC) ----------------
def wrong_hint():
    s = S()
    topbar(s, "Price changes", (9, 20), 21)
    s.rect(64, 104, 760, 600, T["card"], 28, T["line"], 2)
    chip(s, 96, 136, "Price changes · Level 3", T["constBg"], T["constInk"])
    s.text(96, 208, "A bike costs $50.00. The price goes", 24, T["ink"], 800)
    s.rich(96, 242, [("up 20%", {"fill": T["primary"], "weight": 900}), (", then ", {}),
                     ("down 20%", {"fill": T["coral"], "weight": 900}), (". What is the new price?", {})], 24, weight=800)
    opts = [("$50.00", "wrong"), ("$48.00", "idle"), ("$60.00", "idle"), ("$40.00", "idle"), ("$52.00", "idle")]
    x, y = 96, 280
    for i, (t, st) in enumerate(opts):
        cx = x + (i % 3) * 236
        cy = y + (i // 3) * 124
        mc_option(s, cx, cy, 220, 108, st, lambda a, b, t=t: s.text(a, b + 12, t, 34, T["ink"], 800, "middle"))
    # toast
    s.rect(96, 540, 440, 56, T["amberSoft"], 16)
    s.text(120, 575, "Not quite. That's the same as the start price.", 17, T["amber"], 800)
    s.note(96, 540, 1)
    button(s, 96, 628, 200, 56, "Help", "help", icon="turtle")
    button(s, 616, 628, 176, 56, "Check", "disabled", size=22)

    # hint drawer
    s.rect(848, 104, 368, 600, T["help"], 28, T["turtle"], 2)
    turtle(s, 960, 176, 0.75, wave=True)
    s.text(1040, 160, "Shelly", 22, T["helpInk"], 900)
    s.text(1040, 186, "Hint 2 of 3", 15, T["helpInk"], 700)
    s.note(848, 104, 2)
    # ladder dots
    for i in range(3):
        s.circle(1040 + i * 24, 206, 7, T["turtle"] if i < 2 else "#FFFFFF", T["turtle"], 2)
    s.rect(872, 236, 320, 300, T["card"], 18)
    lines = ["Do it one change at a time.", "", "Step 1: up 20% means × 1.20.", "$50.00 × 1.20 = ?", "",
             "Step 2: down 20% is 20% of that", "new, bigger price, not of $50.", "So multiply by 0.80."]
    yy = 272
    for l in lines:
        s.text(892, yy, l, 17, T["ink"], 700)
        yy += 30
    s.note(872, 236, 3)
    button(s, 872, 560, 320, 52, "Show me step by step", "secondary", size=18)
    s.text(1032, 648, "Walkthrough = 1 star, and that's OK!", 14, T["helpInk"], 700, "middle")
    s.text(1032, 684, "Close hint  ✕", 16, T["helpInk"], 800, "middle")
    s.save("03-wrong-answer-hint.svg", "Wrong answer, then the turtle hint drawer (H2)")


# ---------------- 04 Number classification ----------------
def classify():
    s = S()
    topbar(s, "Number sets", (2, 10), 5)
    s.rect(64, 104, 1152, 600, T["card"], 28, T["line"], 2)
    chip(s, 104, 136, "Number sets · Level 3")
    s.text(104, 208, "Which sets does this number belong to? Tick all that apply.", 26, T["ink"], 800)
    frac(s, 640, 318, "12", "4", 64)
    sets = [("Natural", "1, 2, 3, …", True), ("Whole", "0, 1, 2, …", True), ("Integer", "…, −1, 0, 1, …", True),
            ("Rational", "fractions p/q", False), ("Irrational", "never repeats", False), ("Real", "all of these", True)]
    x = 104
    for name, sub, on in sets:
        s.rect(x, 440, 166, 132, T["primarySoft"] if on else T["card"], 18, T["primary"] if on else T["line"], 4 if on else 2)
        s.rect(x + 20, 462, 30, 30, T["primary"] if on else T["card"], 8, T["primary"], 2.5)
        if on:
            s.add(f'<path d="M{x+27},{477} l7,7 l12,-14" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
        s.text(x + 20, 526, name, 21, T["ink"], 900)
        s.text(x + 20, 552, sub, 14, T["muted"], 700)
        x += 180
    s.note(104, 440, 1)
    button(s, 104, 628, 200, 56, "Help", "help", icon="turtle")
    button(s, 324, 628, 220, 56, "Sets map", "secondary", size=18)
    button(s, 1000, 628, 176, 56, "Check", "primary", size=22)
    s.note(324, 628, 2)
    # mini nested sets map (preview)
    mx, my = 870, 330
    s.rect(mx - 10, my - 110, 350, 200, T["bg"], 16)
    s.text(mx, my - 86, "Sets map (opens full size)", 13, T["muted"], 800)
    s.rect(mx, my - 72, 330, 150, "#EEF3F7", 14, "#9FB3C4", 1.5)
    s.text(mx + 10, my - 54, "Real", 12, T["muted"], 800)
    s.rect(mx + 10, my - 46, 200, 116, T["primarySoft"], 12, T["primary"], 1.5)
    s.text(mx + 20, my - 30, "Rational", 12, T["varInk"], 800)
    s.rect(mx + 222, my - 46, 98, 116, T["constBg"], 12, T["constLine"], 1.5)
    s.text(mx + 232, my - 30, "Irrational", 12, T["constInk"], 800)
    s.rect(mx + 20, my - 22, 180, 84, "#C3E6E4", 10, T["primary"], 1.2)
    s.text(mx + 30, my - 6, "Integer", 12, T["varInk"], 800)
    s.rect(mx + 30, my + 2, 160, 54, "#AFDCD9", 9, T["primary"], 1.2)
    s.text(mx + 40, my + 18, "Whole", 12, T["varInk"], 800)
    s.rect(mx + 40, my + 24, 140, 28, "#96D0CC", 8, T["primary"], 1.2)
    s.text(mx + 50, my + 43, "Natural", 12, T["varInk"], 800)
    s.note(860, 220, 3)
    s.save("04-number-classification.svg", "Number classification, select all that apply")


if __name__ == "__main__":
    home(); mc_question(); wrong_hint(); classify()
