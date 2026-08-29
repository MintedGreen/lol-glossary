"""Generate official EN / KO / zh_TW glossary files from Riot Data Dragon."""

from __future__ import annotations

import csv
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT_DIR / "data"
WEB_DATA_DIR = ROOT_DIR / "docs" / "data"
LANGS = {
    "en": "en_US",
    "ko": "ko_KR",
    "zh_TW": "zh_TW",
}
SPELL_KEYS = ["Q", "W", "E", "R"]


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.load(response)


def latest_version() -> str:
    return fetch_json("https://ddragon.leagueoflegends.com/api/versions.json")[0]


def lang_url(version: str, lang: str, filename: str) -> str:
    return f"https://ddragon.leagueoflegends.com/cdn/{version}/data/{lang}/{filename}"


def icon_url(version: str, category: str, icon_ref: str) -> str:
    if not icon_ref:
        return ""
    if category == "rune":
        return f"https://ddragon.leagueoflegends.com/cdn/img/{icon_ref}"
    folder = {"champion": "champion", "item": "item", "summoner_spell": "spell"}[category]
    return f"https://ddragon.leagueoflegends.com/cdn/{version}/img/{folder}/{icon_ref}"


def spell_icon_url(version: str, icon_ref: str, icon_group: str = "spell") -> str:
    if not icon_ref:
        return ""
    folder = "passive" if icon_group == "passive" else "spell"
    return f"https://ddragon.leagueoflegends.com/cdn/{version}/img/{folder}/{icon_ref}"


def load_lang_maps(version: str, filename: str, extractor) -> dict[str, dict]:
    return {
        label: extractor(fetch_json(lang_url(version, lang, filename)))
        for label, lang in LANGS.items()
    }


def names_for(maps: dict[str, dict], entry_id: str) -> dict[str, str]:
    return {
        "en": maps["en"].get(entry_id, {}).get("name", ""),
        "ko": maps["ko"].get(entry_id, {}).get("name", ""),
        "zh_TW": maps["zh_TW"].get(entry_id, {}).get("name", ""),
    }


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def extract_champions(payload: dict) -> dict[str, dict[str, str]]:
    return {
        champ_id: {
            "key": champ["key"],
            "name": champ["name"],
            "title": champ.get("title", ""),
            "icon_ref": champ["image"]["full"],
        }
        for champ_id, champ in payload["data"].items()
    }


def extract_champion_spells(payload: dict, champ_id: str) -> list[dict[str, str]]:
    champ = payload["data"][champ_id]
    spells = [
        {
            "key": "P",
            "name": champ["passive"]["name"],
            "icon_ref": champ["passive"]["image"]["full"],
            "icon_group": champ["passive"]["image"].get("group", "passive"),
        }
    ]
    for index, spell in enumerate(champ["spells"]):
        spells.append(
            {
                "key": SPELL_KEYS[index],
                "name": spell["name"],
                "icon_ref": spell["image"]["full"],
                "icon_group": spell["image"].get("group", "spell"),
            }
        )
    return spells


def load_champion_spell_maps(version: str, champion_ids: list[str]) -> dict[str, dict[str, list[dict[str, str]]]]:
    maps: dict[str, dict[str, list[dict[str, str]]]] = {label: {} for label in LANGS}
    jobs = [(champ_id, label, lang) for champ_id in champion_ids for label, lang in LANGS.items()]

    def fetch_one(champ_id: str, label: str, lang: str) -> tuple[str, str, list[dict[str, str]]]:
        payload = fetch_json(lang_url(version, lang, f"champion/{champ_id}.json"))
        return champ_id, label, extract_champion_spells(payload, champ_id)

    with ThreadPoolExecutor(max_workers=16) as pool:
        for future in as_completed([pool.submit(fetch_one, *job) for job in jobs]):
            champ_id, label, spells = future.result()
            maps[label][champ_id] = spells
    return maps


def merge_champion_spells(
    champ_id: str,
    spell_maps: dict[str, dict[str, list[dict[str, str]]]],
    version: str,
) -> list[dict[str, str]]:
    merged: list[dict[str, str]] = []
    for en_spell in spell_maps["en"].get(champ_id, []):
        key = en_spell["key"]
        by_key = {
            label: {spell["key"]: spell for spell in spell_maps[label].get(champ_id, [])}
            for label in LANGS
        }
        merged.append(
            {
                "key": key,
                "en": by_key["en"].get(key, {}).get("name", ""),
                "ko": by_key["ko"].get(key, {}).get("name", ""),
                "zh_TW": by_key["zh_TW"].get(key, {}).get("name", ""),
                "icon": spell_icon_url(
                    version,
                    en_spell.get("icon_ref", ""),
                    en_spell.get("icon_group", "spell"),
                ),
            }
        )
    return merged


def is_shadow_variant(item_id: str, all_ids: set[str]) -> bool:
    if item_id.startswith("32") and len(item_id) > 4 and item_id[2:] in all_ids:
        return True
    if item_id.startswith("66") and len(item_id) > 4 and item_id[2:] in all_ids:
        return True
    if len(item_id) > 4 and item_id.endswith("66") and item_id[:-2] in all_ids:
        return True
    return False


def classify_item_tier(item: dict) -> str:
    tags = set(item.get("tags") or [])
    name = item.get("name", "")

    if "Trinket" in tags:
        return "trinket"
    if "Consumable" in tags or name == "Control Ward":
        return "consumable"
    if any(token in name for token in ("Potion", "Elixir", "Juice", "Biscuit", "Soda")):
        return "consumable"
    if "Boots" in tags:
        return "boots"
    if "Lane" in tags:
        return "starter"

    depth = item.get("depth", 0)
    if depth == 2:
        return "epic"
    if depth >= 3:
        return "legendary"
    return "basic"


def extract_items(payload: dict) -> dict[str, dict]:
    all_ids = set(payload["data"].keys())
    rows: dict[str, dict] = {}
    for item_id, item in payload["data"].items():
        maps = item.get("maps") or {}
        rows[item_id] = {
            "key": item_id,
            "name": item["name"],
            "icon_ref": item["image"]["full"],
            "item_tier": classify_item_tier(item),
            "purchasable": bool(item.get("gold", {}).get("purchasable", True)),
            "is_shadow": is_shadow_variant(item_id, all_ids),
            "on_sr": bool(maps.get("11")),
        }
    return rows


def extract_summoner_spells(payload: dict) -> dict[str, dict]:
    return {
        spell_id: {
            "key": spell["key"],
            "name": spell["name"],
            "icon_ref": spell["image"]["full"],
            "on_sr": "CLASSIC" in (spell.get("modes") or []),
        }
        for spell_id, spell in payload["data"].items()
    }


def extract_runes(payload: list) -> dict[str, dict[str, str]]:
    rows: dict[str, dict[str, str]] = {}
    for tree in payload:
        tree_id = str(tree["id"])
        for slot_index, slot in enumerate(tree["slots"], start=1):
            for rune_index, rune in enumerate(slot["runes"], start=1):
                rune_id = str(rune["id"])
                rows[rune_id] = {
                    "key": rune_id,
                    "name": rune["name"],
                    "icon_ref": rune["icon"],
                    "tree_id": tree_id,
                    "tree_name": tree["name"],
                    "slot": str(slot_index),
                    "slot_order": str(rune_index),
                    "rune_type": "rune",
                }
    return rows


def dedupe_items(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    best_by_name: dict[str, dict[str, str]] = {}
    for row in rows:
        name = row.get("en") or row["id"]
        existing = best_by_name.get(name)
        if existing is None or int(row["id"]) < int(existing["id"]):
            best_by_name[name] = row
    kept_ids = {row["id"] for row in best_by_name.values()}
    return [row for row in rows if row["id"] in kept_ids]


def build_champion_rows(
    version: str,
    maps: dict[str, dict],
    spell_maps: dict[str, dict[str, list[dict[str, str]]]],
) -> list[dict]:
    rows: list[dict] = []
    for champ_id in sorted(maps["en"]):
        info = maps["en"][champ_id]
        rows.append(
            {
                "category": "champion",
                "id": champ_id,
                "key": info["key"],
                **names_for(maps, champ_id),
                "title_en": info.get("title", ""),
                "title_ko": maps["ko"].get(champ_id, {}).get("title", ""),
                "title_zh_TW": maps["zh_TW"].get(champ_id, {}).get("title", ""),
                "icon": icon_url(version, "champion", info.get("icon_ref", "")),
                "spells": merge_champion_spells(champ_id, spell_maps, version),
            }
        )
    return rows


def build_item_rows(version: str, maps: dict[str, dict]) -> list[dict]:
    rows: list[dict] = []
    for item_id, info in maps["en"].items():
        if not info.get("on_sr") or not info.get("purchasable") or info.get("is_shadow"):
            continue
        rows.append(
            {
                "category": "item",
                "id": item_id,
                "key": info["key"],
                **names_for(maps, item_id),
                "item_tier": info.get("item_tier", "basic"),
                "icon": icon_url(version, "item", info.get("icon_ref", "")),
            }
        )
    return dedupe_items(rows)


def build_spell_rows(version: str, maps: dict[str, dict]) -> list[dict]:
    rows: list[dict] = []
    for spell_id, info in maps["en"].items():
        if not info.get("on_sr"):
            continue
        rows.append(
            {
                "category": "summoner_spell",
                "id": spell_id,
                "key": info["key"],
                **names_for(maps, spell_id),
                "icon": icon_url(version, "summoner_spell", info.get("icon_ref", "")),
            }
        )
    return rows


def build_rune_rows(version: str, maps: dict[str, dict]) -> list[dict]:
    rows: list[dict] = []
    for rune_id, info in maps["en"].items():
        rows.append(
            {
                "category": "rune",
                "id": rune_id,
                "key": info["key"],
                **names_for(maps, rune_id),
                "rune_type": info.get("rune_type", "rune"),
                "tree_id": info.get("tree_id", ""),
                "tree_en": info.get("tree_name", ""),
                "tree_ko": maps["ko"].get(rune_id, {}).get("tree_name", ""),
                "tree_zh_TW": maps["zh_TW"].get(rune_id, {}).get("tree_name", ""),
                "slot": info.get("slot", ""),
                "slot_order": info.get("slot_order", ""),
                "icon": icon_url(version, "rune", info.get("icon_ref", "")),
            }
        )
    return rows


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def main() -> None:
    version = latest_version()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)

    champion_maps = load_lang_maps(version, "champion.json", extract_champions)
    champion_ids = sorted(champion_maps["en"])
    champion_rows = build_champion_rows(
        version,
        champion_maps,
        load_champion_spell_maps(version, champion_ids),
    )
    item_rows = build_item_rows(version, load_lang_maps(version, "item.json", extract_items))
    spell_rows = build_spell_rows(version, load_lang_maps(version, "summoner.json", extract_summoner_spells))
    rune_rows = build_rune_rows(version, load_lang_maps(version, "runesReforged.json", extract_runes))

    write_csv(
        OUTPUT_DIR / "champions.csv",
        ["category", "id", "key", "en", "ko", "zh_TW", "title_en", "title_ko", "title_zh_TW"],
        champion_rows,
    )
    write_csv(
        OUTPUT_DIR / "items.csv",
        ["category", "id", "key", "en", "ko", "zh_TW", "item_tier"],
        item_rows,
    )
    write_csv(
        OUTPUT_DIR / "summoner_spells.csv",
        ["category", "id", "key", "en", "ko", "zh_TW"],
        spell_rows,
    )
    write_csv(
        OUTPUT_DIR / "runes.csv",
        [
            "category",
            "id",
            "key",
            "en",
            "ko",
            "zh_TW",
            "tree_id",
            "tree_en",
            "tree_ko",
            "tree_zh_TW",
            "slot",
            "slot_order",
        ],
        rune_rows,
    )

    entries = champion_rows + item_rows + spell_rows + rune_rows
    metadata = {
        "version": version,
        "source": "Riot Data Dragon",
        "updatedAt": utc_now(),
        "languages": LANGS,
        "scope": "Summoner's Rift",
        "files": {
            "champions": len(champion_rows),
            "items": len(item_rows),
            "summoner_spells": len(spell_rows),
            "runes": len(rune_rows),
            "combined": len(entries),
        },
    }
    (OUTPUT_DIR / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    payload = {
        "version": version,
        "source": "Riot Data Dragon",
        "scope": "Summoner's Rift",
        "updatedAt": metadata["updatedAt"],
        "languages": LANGS,
        "counts": metadata["files"],
        "entries": entries,
    }
    (WEB_DATA_DIR / "glossary.js").write_text(
        "window.GLOSSARY_DATA = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )

    print(json.dumps(metadata, ensure_ascii=False, indent=2))
    print(f"Wrote website data to {WEB_DATA_DIR / 'glossary.js'}")


if __name__ == "__main__":
    main()
