import json
import os
from datetime import datetime
from pathlib import Path

# Папка с фото (относительно корня репозитория)
PHOTOS_DIR = Path("photos")
# Итоговый файл
OUTPUT_FILE = Path("photos.json")
# Существующий JSON (чтобы сохранить ручные правки)
EXISTING_FILE = Path("photos.json")

# Поддерживаемые форматы
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}


def load_existing():
    """Читает существующий photos.json, чтобы сохранить ручные title/category."""
    if not EXISTING_FILE.exists():
        return {}
    try:
        with open(EXISTING_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Делаем словарь по id
        return {p["id"]: p for p in data.get("photos", [])}
    except Exception as e:
        print(f"Не удалось прочитать существующий JSON: {e}")
        return {}


def get_photos(existing):
    """Собирает информацию о всех фото в папке."""
    photos = []

    if not PHOTOS_DIR.exists():
        print(f"Папка {PHOTOS_DIR} не найдена")
        return photos

    for file_path in sorted(PHOTOS_DIR.iterdir()):
        if file_path.is_file() and file_path.suffix.lower() in IMAGE_EXTENSIONS:
            photo_id = file_path.stem
            added = datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()

            # Если запись уже есть — сохраняем title/category
            if photo_id in existing:
                title = existing[photo_id].get("title", photo_id)
                category = existing[photo_id].get("category", "all")
            else:
                title = photo_id
                category = "all"

            photos.append({
                "id": photo_id,
                "file": f"photos/{file_path.name}",
                "title": title,
                "category": category,
                "added": added
            })

    # Сортируем от новых к старым
    photos.sort(key=lambda p: p["added"], reverse=True)
    return photos


def main():
    existing = load_existing()
    photos = get_photos(existing)

    data = {
        "photos": photos,
        "generated_at": datetime.utcnow().isoformat(),
        "total": len(photos)
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Сгенерировано {len(photos)} записей в {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
