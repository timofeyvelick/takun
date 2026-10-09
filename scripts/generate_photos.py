import json
import hashlib
from datetime import datetime
from pathlib import Path

PHOTOS_DIR = Path("photos")
OUTPUT_FILE = Path("photos.json")
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}

TAG_MAP = {
    "work": "Работа",
    "life": "Жизнь",
    "friends": "Друзья",
    "travel": "Путешествия",
}


def file_id(filename):
    """Стабильный id из имени файла. Не меняется при перезагрузке."""
    return int(hashlib.md5(filename.encode()).hexdigest()[:10], 16)


def load_existing():
    """Читает текущий photos.json (плоский массив)."""
    if not OUTPUT_FILE.exists():
        return {}
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return {p.get("src"): p for p in data if isinstance(p, dict)}
    except Exception as e:
        print(f"Ошибка чтения: {e}")
    return {}


def get_photos(existing):
    photos = []
    used_ids = set()

    if not PHOTOS_DIR.exists():
        print(f"Папка {PHOTOS_DIR} не найдена")
        return photos

    for file_path in sorted(PHOTOS_DIR.iterdir()):
        if not (file_path.is_file() and file_path.suffix.lower() in IMAGE_EXTENSIONS):
            continue

        src = f"photos/{file_path.name}"
        old = existing.get(src, {})

        # id: сохраняем старый, иначе — hash от имени файла
        photo_id = old.get("id")
        if not isinstance(photo_id, int):
            photo_id = file_id(file_path.name)

        # На случай коллизии — маловероятно
        while photo_id in used_ids:
            photo_id = file_id(file_path.name + str(photo_id))
        used_ids.add(photo_id)

        # added: из старого JSON, иначе — дата модификации файла
        added = old.get("added")
        if not added:
            added = datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()

        cat = old.get("cat", "life")
        tag = old.get("tag") or TAG_MAP.get(cat, "Разное")

        photos.append({
            "id": photo_id,
            "cat": cat,
            "tag": tag,
            "date": old.get("date", ""),
            "title": old.get("title", file_path.stem),
            "src": src,
            "added": added,
        })

    photos.sort(key=lambda p: p.get("added", ""), reverse=True)
    return photos


def main():
    existing = load_existing()
    photos = get_photos(existing)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(photos, f, ensure_ascii=False, indent=2)
    print(f"Сгенерировано {len(photos)} записей")


if __name__ == "__main__":
    main()
