# LoL Glossary

Official **English / Korean / Traditional Chinese** names for League of Legends champions, items, summoner spells, and runes.

**Demo:** [https://mintedgreen.github.io/lol-glossary/](https://mintedgreen.github.io/lol-glossary/)

Data comes from [Riot Data Dragon](https://developer.riotgames.com/docs/lol). The site is static HTML/CSS/JS, so it can run locally or on GitHub Pages.

## Features

- Search English, Korean, Traditional Chinese, ids, titles, and rune trees at once
- Browse by Champions, Items, Summoner Spells, or Runes
- Shareable URLs such as `?q=vayne` or `?q=vayne&cat=champion`

The homepage shows only the search header until you type a query or pick a category.

## Generate data

From this folder:

```bash
python generate_lol_glossary.py
```

This fetches the latest Data Dragon patch and writes:


| Output                  | Purpose                             |
| ----------------------- | ----------------------------------- |
| `data/`                 | CSV lookup tables and metadata      |
| `docs/data/glossary.js` | Embedded data loaded by the website |


A GitHub Action runs this weekly and opens a pull request when the patch data changes. You can also trigger it from **Actions → Update glossary → Run workflow**.