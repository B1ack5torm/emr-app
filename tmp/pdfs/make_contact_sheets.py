from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def make_sheet(files, output, columns=3, thumb_width=420):
    font = ImageFont.load_default(size=16)
    cards = []
    for path in files:
        with Image.open(path) as source:
            image = source.convert("RGB")
            height = round(image.height * thumb_width / image.width)
            image = image.resize((thumb_width, height), Image.Resampling.LANCZOS)
        card_height = height + 42
        card = Image.new("RGB", (thumb_width + 20, card_height), "white")
        card.paste(image, (10, 30))
        ImageDraw.Draw(card).text((10, 8), path.stem, fill="#17202A", font=font)
        cards.append(card)
    rows = (len(cards) + columns - 1) // columns
    row_heights = []
    for row in range(rows):
        row_heights.append(max(card.height for card in cards[row * columns:(row + 1) * columns]))
    sheet = Image.new("RGB", (columns * (thumb_width + 20), sum(row_heights)), "#E9E5DC")
    y = 0
    for row in range(rows):
        for col, card in enumerate(cards[row * columns:(row + 1) * columns]):
            sheet.paste(card, (col * (thumb_width + 20), y))
        y += row_heights[row]
    sheet.save(output, quality=92)


root = Path(__file__).parent
screens = sorted((root / "screens" / "EMR App").glob("*.png"))
source_pages = sorted((root / "source-render").glob("*.png"))
professional_pages = sorted((root / "professional-render").glob("page-*.png"))
make_sheet(screens, root / "screens-contact.jpg", columns=3, thumb_width=420)
make_sheet(source_pages, root / "source-contact.jpg", columns=4, thumb_width=300)
make_sheet(professional_pages, root / "professional-contact.jpg", columns=4, thumb_width=300)
print(f"screens={len(screens)} source_pages={len(source_pages)} professional_pages={len(professional_pages)}")
for path in screens:
    with Image.open(path) as image:
        print(f"{path.name}\t{image.width}x{image.height}")
