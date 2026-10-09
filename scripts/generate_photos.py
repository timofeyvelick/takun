import json
import re
from datetime import datetime
from pathlib import Path

PHOTOS_DIR = Path("photos")
OUTPUT_FILE = Path("photos.json")
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}

# Русские подписи для категорий
TAG_MAP = {
    "work": "Работа",
    "life": "Жизнь",
    "friends": "Друзья",
    "travel": "Путешествия",
}


def load_existing():
    """Читает photos.json (в старом формате — просто массив)."""
    if not OUTPUT_FILE.exists():
        return {}
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Если это старый формат — просто массив
        if isinstance(data, list):
            return {p.get("src"): p for p in data if isinstance(p, dict)}
        # Если новый формат — с обёрткой
        if isinstance(data, dict) and "photos" in data:
            return {p.get("file") or p.get("src"): p for p in data["photos"] if isinstance(p, dict)}
    except Exception as e:
        print(f"Не удалось прочитать существующий JSON: {e}")
    return {}


def extract_number(name):
    """Из '77' -> 77, из 'photo_42' -> 42."""
    m = re.search(r'\d+', name)
    return int(m.group()) if m else None


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
        name = file_path.stem

        # Ищем старую запись по src или по file
        old = existing.get(src, {})
        if not old:
            # попробуем найти по имени файла (для нового формата, где ключ — file)
            for key, val in existing.items():
                if key and key.endswith(file_path.name):
                    old = val
                    break

        # id — числом!
        photo_id = old.get("id")
        if isinstance(photo_id, str):
            try:
                photo_id = int(photo_id)
            except ValueError:
                photo_id = None
        if photo_id is None:
            photo_id = extract_number(name)
        if photo_id is None or photo_id in used_ids:
            photo_id = max(used_ids | {0}) + 1
        used_ids.add(photo_id)

        # added
        added = old.get("added")
        if not added:
            added = datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()

        # cat / tag
        cat = old.get("cat", "life")
        tag = old.get("tag") or TAG_MAP.get(cat, "Разное")

        photo = {
            "id": photo_id,
            "cat": cat,
            "tag": tag,
            "date": old.get("date", ""),
            "title": old.get("title", name),
            "src": src,
            "added": added,
        }
        if old.get("private"):
            photo["private"] = True

        photos.append(photo)

    photos.sort(key=lambda p: p.get("added", ""), reverse=True)
    return photos


def main():
    existing = load_existing()
    photos = get_photos(existing)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(photos, f, ensure_ascii=False, indent=2)
    print(f"Сгенерировано {len(photos)} записей в {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
