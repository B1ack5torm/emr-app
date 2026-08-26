from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


SRC = Path(r"C:\Users\Admin\AppData\Local\Temp")
OUT = Path(r"C:\Users\Admin\Documents\emr-app\tmp\customer-guide-v2\sanitized")
OUT.mkdir(parents=True, exist_ok=True)

FILES = [
    ("01_landing", "codex-clipboard-b8baed96-a59c-4a1d-a6c6-c70a53c36256.png"),
    ("02_login", "codex-clipboard-dc6bdeb4-d844-45eb-a9cc-13e73fb64842.png"),
    ("03_front_desk", "codex-clipboard-8427bef0-baff-44c5-8a70-6d5478b92138.png"),
    ("04_registration", "codex-clipboard-cc14581d-e96f-47cc-9fa2-f820e46169e5.png"),
    ("05_schedule", "codex-clipboard-7e8f6b40-d058-44c1-a271-c9a3c2f1117e.png"),
    ("06_new_appointment", "codex-clipboard-31c36fc5-5dc2-44ca-8782-f14b44ae1d4a.png"),
    ("07_doctors_desk", "codex-clipboard-d39554a3-f2e9-4519-a080-6d3bc1d4378f.png"),
    ("08_consultation", "codex-clipboard-d97be9aa-acb0-4755-b5dd-9b65a80426eb.png"),
    ("09_consultation_orders", "codex-clipboard-63bb05eb-205c-4265-9588-830a3001c205.png"),
    ("10_signature", "codex-clipboard-7c774892-f3a5-4f59-ad60-2ecc2a5da5a8.png"),
    ("11_patient_records", "codex-clipboard-bbd176b5-6bef-44e5-943d-3e095bf7731b.png"),
    ("12_admin", "codex-clipboard-640ab2ec-e295-4e12-84b5-f88da29c9fa5.png"),
    ("13_staff", "codex-clipboard-66ffe429-fd8b-404a-833b-10df2351933c.png"),
    ("14_billing", "codex-clipboard-e3a8a424-4489-4ac8-a459-841f4f56e5d0.png"),
    ("15_invoice", "codex-clipboard-5abed85a-ef6f-4eb7-abf0-896e0bd62af7.png"),
    ("16_payment", "codex-clipboard-b1f086fb-20ff-4282-800e-add0d85ccb13.png"),
    ("17_diagnostics", "codex-clipboard-f9a17426-f928-4977-92ea-3a43c023815e.png"),
    ("18_documents", "codex-clipboard-6f583c9a-53a3-4019-b8f8-8eada805cb21.png"),
    ("19_audit", "codex-clipboard-20c56ec7-43e4-4ba0-b0ec-6205f791c84d.png"),
    ("20_clinic_settings", "codex-clipboard-e5a45b94-6800-4c37-be9c-42fa296770ec.png"),
    ("21_practitioner_settings", "codex-clipboard-f2644839-9506-4cf8-8797-d764fe73782a.png"),
    ("22_service_settings", "codex-clipboard-d6d99c9a-db33-43f5-a6fa-cbeeaadb7cd6.png"),
]

FONT = Path(r"C:\Windows\Fonts\arial.ttf")
BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")
INK = "#18332d"
MUTED = "#526b65"
GREEN = "#3e7465"
PALE = "#e8f2ee"
CREAM = "#f8f5ed"
WHITE = "#ffffff"
FIELD = "#fbfaf6"


def font(size, bold=False):
    return ImageFont.truetype(str(BOLD if bold else FONT), size=size)


def box(draw, xy, fill=WHITE, radius=0, outline=None):
    if radius:
        draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline)
    else:
        draw.rectangle(xy, fill=fill, outline=outline)


def label(draw, xy, text, size=14, bold=False, fill=INK):
    draw.text(xy, text, font=font(size, bold), fill=fill)


def line(draw, xy, fill="#dfd8ca", width=1):
    draw.line(xy, fill=fill, width=width)


def sanitize(name, im):
    d = ImageDraw.Draw(im)
    w, h = im.size

    if name == "01_landing":
        box(d, (842, 632, 944, 664), fill=PALE, radius=16)
        label(d, (855, 642), "Clinician", 11, True, GREEN)

    elif name == "02_login":
        box(d, (32, 113, 348, 153), fill="#e7eef9", radius=7)
        label(d, (46, 128), "user@example.com", 14, False, "#111111")

    elif name == "07_doctors_desk":
        box(d, (292, 454, 1054, 500), fill=WHITE)
        label(d, (298, 463), "Sample Patient", 13, True, "#0c2230")
        label(d, (405, 463), "· Adult · DEMO", 12, False, "#60758a")
        label(d, (298, 483), "Example visit reason", 11, False, "#60758a")
        box(d, (1063, 464, 1146, 491), fill="#fff4dd", radius=14)
        label(d, (1077, 472), "10:00 AM", 10, True, "#a26b16")

    elif name == "08_consultation":
        box(d, (270, 152, 700, 195), fill=CREAM)
        label(d, (272, 158), "Sample Patient", 18, True, "#132b37")
        label(d, (272, 181), "Adult · DEMO-0001 · identifiers removed", 11, False, "#61788c")
        box(d, (272, 250, 1149, 294), fill=WHITE, radius=7, outline="#ded6c8")
        label(d, (284, 268), "Chief complaint:", 12, True, "#122a36")
        label(d, (386, 268), "Example complaint", 12, False, "#122a36")
        label(d, (716, 268), "Vitals:", 12, True, "#122a36")
        label(d, (758, 268), "Enter measured values", 12, False, "#122a36")
        box(d, (272, 361, 1149, 425), fill=WHITE, radius=6, outline="#ded6c8")
        label(d, (283, 377), "Example examination notes for training only.", 12, False, "#44535c")
        box(d, (272, 459, 1149, 496), fill=WHITE, radius=6, outline="#ded6c8")
        label(d, (283, 472), "Example diagnosis", 12, False, "#44535c")
        box(d, (272, 532, 1149, 594), fill=WHITE, radius=6, outline="#ded6c8")
        label(d, (283, 548), "Example advice. Follow the hospital's approved clinical process.", 12, False, "#44535c")

    elif name == "09_consultation_orders":
        box(d, (16, 294, 770, 522), fill=WHITE)
        y = 296
        for idx, status in enumerate(["REVIEWED", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS"]):
            box(d, (16, y, 769, y + 42), fill=FIELD, radius=5, outline="#ded6c8")
            label(d, (23, y + 8), f"Example laboratory order {chr(65 + idx)}", 10, True, "#263b43")
            label(d, (23, y + 23), f"DEMO-ORDER-{idx + 1:03d} · {status}", 9, False, "#60758a")
            y += 47

    elif name == "11_patient_records":
        rows = [(234, 318), (330, 414), (426, 510), (522, 606)]
        for idx, (y1, y2) in enumerate(rows, 1):
            box(d, (232, y1, 1206, y2), fill=WHITE, radius=8, outline="#ded6c8")
            box(d, (232, y1, 236, y2), fill=GREEN)
            label(d, (252, y1 + 18), f"Sample Patient {chr(64 + idx)}", 14, True, "#0d2633")
            label(d, (252, y1 + 40), f"MRN-DEMO-{idx:04d}", 11, False, "#60758a")
            label(d, (252, y1 + 59), "Adult · demonstration record", 11, False, "#60758a")
            label(d, (1177, y1 + 29), "v", 13, True, "#60758a")

    elif name == "13_staff":
        rows = [
            (52, 112, "Demo Administrator", "admin@example.com"),
            (122, 182, "Front Desk User", "frontdesk@example.com"),
            (192, 252, "Demo Clinician", "clinician@example.com"),
            (262, 323, "Super Administrator", "superadmin@example.com"),
        ]
        for y1, y2, nm, email in rows:
            box(d, (10, y1, 520, y2), fill=WHITE)
            label(d, (26, y1 + 15), nm, 14, True, "#0d2633")
            label(d, (26, y1 + 36), email, 11, False, "#60758a")

    elif name == "14_billing":
        rows = [(272, 330), (342, 400), (412, 470), (482, 540)]
        for idx, (y1, y2) in enumerate(rows, 1):
            box(d, (232, y1, 820, y2), fill=WHITE)
            label(d, (247, y1 + 15), f"INV-{idx} · Sample Patient {chr(64 + idx)}", 14, True, "#0d2633")
            label(d, (247, y1 + 36), "Demonstration date", 11, False, "#60758a")

    elif name == "15_invoice":
        box(d, (10, 25, 310, 71), fill=CREAM)
        label(d, (11, 31), "Invoice INV-DEMO", 18, True, "#132b37")
        label(d, (11, 56), "Sample Patient · Demonstration date", 11, False, "#60758a")
        box(d, (36, 106, 300, 151), fill=WHITE)
        label(d, (37, 115), "Sample Patient", 13, True, "#0d2633")
        label(d, (37, 136), "DEMO-0001", 12, False, "#60758a")
        box(d, (212, 199, 439, 229), fill=FIELD, radius=4, outline="#ded6c8")
        label(d, (219, 207), "Example consultation", 12, False, "#1a333f")

    elif name == "16_payment":
        box(d, (25, 98, 630, 126), fill=WHITE)
        label(d, (26, 103), "Demonstration payment date · CASH", 13, False, "#1a333f")

    elif name == "17_diagnostics":
        box(d, (288, 282, 1020, 323), fill=WHITE)
        label(d, (288, 286), "Example laboratory order", 14, True, "#0d2633")
        label(d, (288, 305), "DEMO-ORDER-001 · Sample Patient · LABORATORY · Demo Clinician", 10, False, "#60758a")
        box(d, (288, 324, 1046, 357), fill=FIELD, radius=6)
        label(d, (295, 333), "Result: Example result summary; final report attached.", 11, False, "#213943")
        box(d, (298, 400, 600, 435), fill=WHITE)
        label(d, (312, 411), "Open example-report.pdf", 10, True, "#214c40")
        box(d, (288, 498, 1015, 536), fill=WHITE)
        label(d, (288, 501), "Example laboratory order", 14, True, "#0d2633")
        label(d, (288, 520), "DEMO-ORDER-002 · Sample Patient · IN PROGRESS", 10, False, "#60758a")
        box(d, (303, 627, 1118, 644), fill=WHITE)
        label(d, (303, 629), "Attach an approved report. Uploading sends it to the ordering clinician for review.", 10, False, "#60758a")

    elif name == "19_audit":
        box(d, (271, 255, 1150, 729), fill=WHITE)
        actions = ["PATIENT_VIEWED", "LOGIN_SUCCEEDED", "ACTIVE_HOSPITAL_CHANGED", "LOGOUT", "LOGIN_FAILED", "DOCUMENT_UPLOADED"]
        y = 255
        for idx, action in enumerate(actions):
            y2 = y + 52
            line(d, (271, y2, 1150, y2))
            label(d, (282, y + 16), "Demo timestamp", 10, False, "#203843")
            label(d, (438, y + 16), action, 10, True, "#0d2633")
            label(d, (669, y + 9), "Demo resource", 10, False, "#203843")
            label(d, (858, y + 9), "Demo user", 10, False, "#203843")
            label(d, (1042, y + 16), "—", 10, False, "#203843")
            y = y2

    # Extend the canvas so the notice never covers application controls.
    notice_h = 24
    canvas = Image.new("RGB", (w, h + notice_h), PALE)
    canvas.paste(im, (0, 0))
    nd = ImageDraw.Draw(canvas)
    label(nd, (12, h + 6), "DEMONSTRATION SCREEN · IDENTIFIERS REMOVED OR REPLACED", 10, True, GREEN)
    return canvas


def main():
    manifest = []
    for name, filename in FILES:
        source = SRC / filename
        if not source.exists():
            raise FileNotFoundError(source)
        with Image.open(source) as raw:
            cleaned = sanitize(name, raw.convert("RGB"))
            destination = OUT / f"{name}.png"
            cleaned.save(destination, format="PNG", optimize=True)
            manifest.append(f"{name}\t{source.name}\t{cleaned.width}x{cleaned.height}")
    (OUT / "manifest.tsv").write_text("\n".join(manifest) + "\n", encoding="utf-8")
    print(f"Sanitized {len(manifest)} screenshots into {OUT}")


if __name__ == "__main__":
    main()
