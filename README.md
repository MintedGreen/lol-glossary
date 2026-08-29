# LoL Glossary

Official **English / Korean / Taiwan Chinese** names for League of Legends champions, items, summoner spells, and runes.

Data comes from [Riot Data Dragon](https://developer.riotgames.com/docs/lol). The site is static HTML/CSS/JS, so it can run locally or on GitHub Pages.

## Features

- Search English, Korean, Traditional Chinese, ids, titles, and rune trees at once
- Browse by Champions, Items, Summoner Spells, or Runes
- Copy a row as `English / Korean / 台灣中文`
- Shareable URLs such as `?q=vayne&cat=champion`

The homepage shows only the search header until you type a query or pick a category.

## Requirements

- Python 3 (stdlib only — no pip packages)
- A browser

## Generate data

From this folder:

```bash
python generate_lol_glossary.py
```

This fetches the latest Data Dragon patch and writes:

| Output | Purpose |
| --- | --- |
| `data/` | CSV lookup tables and metadata |
| `docs/data/glossary.js` | Embedded data loaded by the website |

Re-run this after each LoL patch, then commit the updated files.

## Run locally

From this folder:

```powershell
.\serve.ps1
```

Or:

```bash
python -m http.server 8080 --directory docs
```

Then open [http://localhost:8080](http://localhost:8080).

If you see `ERR_EMPTY_RESPONSE`, another process may already be using port 8080. Run `serve.ps1` again — it stops conflicting listeners first.

## Deploy to GitHub Pages

GitHub Pages only allows `/` (root) or `/docs` — there is no `/web` option. This site lives in `docs/`.

1. Open **Settings → Pages**.
2. Set **Source** to **Deploy from a branch**.
3. Branch: `main`. Folder: `/docs`.
4. Click **Save**. The site will be at `https://mintedgreen.github.io/lol-glossary/`.

After each patch, run `python generate_lol_glossary.py`, commit `docs/data/`, and push.

## Project layout

```text
lol_glossary/
  generate_lol_glossary.py
  serve.ps1
  data/
    champions.csv
    items.csv
    summoner_spells.csv
    runes.csv
    metadata.json
  docs/
    index.html
    styles.css
    app.js
    data/
      glossary.js
```
