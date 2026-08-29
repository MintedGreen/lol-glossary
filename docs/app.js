const CATEGORIES = [
  { id: "champion", label: "Champions", countKey: "champions" },
  { id: "item", label: "Items", countKey: "items" },
  { id: "summoner_spell", label: "Summoner Spells", countKey: "summoner_spells" },
  { id: "rune", label: "Runes", countKey: "runes" },
];

const RUNE_TREE_ORDER = ["8000", "8100", "8200", "8400", "8300"];

const RUNE_SLOTS = ["1", "2", "3", "4"];

const ITEM_TIERS = [
  { id: "starter", label: "Starter" },
  { id: "boots", label: "Boots" },
  { id: "basic", label: "Basic" },
  { id: "epic", label: "Epic" },
  { id: "legendary", label: "Legendary" },
  { id: "consumable", label: "Consumables" },
  { id: "trinket", label: "Trinkets" },
];

const CATEGORY_LABELS = {
  champion: "Champion",
  item: "Item",
  summoner_spell: "Summoner Spell",
  rune: "Rune",
};

const state = {
  entries: [],
  version: "—",
  counts: {},
  query: "",
  category: "",
  selectedChampionId: "",
  selectedRuneId: "",
  selectedSummonerId: "",
  itemTier: "starter",
  selectedItemId: "",
  selectedSearchKey: "",
  detailLang: "en",
};

const elements = {
  patchVersion: document.getElementById("patch-version"),
  searchInput: document.getElementById("search-input"),
  clearSearch: document.getElementById("clear-search"),
  categoryTabs: document.getElementById("category-tabs"),
  resultsSummary: document.getElementById("results-summary"),
  resultsBar: document.getElementById("results-bar"),
  emptyState: document.getElementById("empty-state"),
  searchView: document.getElementById("search-view"),
  searchSummary: document.getElementById("search-summary"),
  searchHits: document.getElementById("search-hits"),
  searchDetail: document.getElementById("search-detail"),
  championView: document.getElementById("champion-view"),
  championGrid: document.getElementById("champion-grid"),
  championDetail: document.getElementById("champion-detail"),
  itemView: document.getElementById("item-view"),
  itemTierTabs: document.getElementById("item-tier-tabs"),
  itemGrid: document.getElementById("item-grid"),
  itemDetail: document.getElementById("item-detail"),
  summonerView: document.getElementById("summoner-view"),
  summonerGrid: document.getElementById("summoner-grid"),
  summonerDetail: document.getElementById("summoner-detail"),
  runeView: document.getElementById("rune-view"),
  runeGroups: document.getElementById("rune-groups"),
  runeDetail: document.getElementById("rune-detail"),
  searchHitTemplate: document.getElementById("search-hit-template"),
  championTileTemplate: document.getElementById("champion-tile-template"),
  championDetailTemplate: document.getElementById("champion-detail-template"),
  itemTileTemplate: document.getElementById("item-tile-template"),
  itemDetailTemplate: document.getElementById("item-detail-template"),
  summonerTileTemplate: document.getElementById("summoner-tile-template"),
  summonerDetailTemplate: document.getElementById("summoner-detail-template"),
  runeTileTemplate: document.getElementById("rune-tile-template"),
  runeDetailTemplate: document.getElementById("rune-detail-template"),
};

init();

function init() {
  readUrlState();
  bindEvents();

  if (!window.GLOSSARY_DATA) {
    showLoadError(new Error("Missing glossary data. Run generate_lol_glossary.py."));
    return;
  }

  applyPayload(window.GLOSSARY_DATA);
}

function applyPayload(payload) {
  state.entries = payload.entries ?? [];
  state.version = payload.version ?? "—";
  state.counts = payload.counts ?? {};

  elements.patchVersion.textContent = state.version;
  elements.searchInput.value = state.query;

  renderTabs();
  renderResults();
}

function showLoadError(error) {
  document.body.classList.remove("landing");
  setActiveView("error");
  elements.resultsSummary.textContent =
    "Could not load glossary data. Run generate_lol_glossary.py, or start the local server with serve.ps1.";
  elements.emptyState.textContent = String(error);
  elements.emptyState.classList.add("visible");
  console.error(error);
}

function bindEvents() {
  let debounceTimer;

  elements.searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.query = elements.searchInput.value.trim();
      if (!state.query) {
        state.selectedSearchKey = "";
      }
      syncUrl();
      renderResults();
    }, 120);
  });

  elements.clearSearch.addEventListener("click", () => {
    state.query = "";
    state.selectedSearchKey = "";
    elements.searchInput.value = "";
    syncUrl();
    renderResults();
    elements.searchInput.focus();
  });

  window.addEventListener("scroll", hideHoverTip, true);
  window.addEventListener("resize", hideHoverTip);
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get("cat") ?? "";
  state.query = params.get("q") ?? "";
  state.category = CATEGORIES.some((item) => item.id === category) ? category : "";
  state.selectedChampionId = params.get("ch") ?? "";
  state.selectedRuneId = params.get("r") ?? "";
  state.selectedSummonerId = params.get("s") ?? "";
  state.itemTier = params.get("t") ?? "starter";
  state.selectedItemId = params.get("i") ?? "";
  state.selectedSearchKey = params.get("e") ?? "";
}

function syncUrl() {
  if (window.location.protocol === "file:") {
    return;
  }

  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.category) params.set("cat", state.category);
  if (state.category === "champion" && state.selectedChampionId) {
    params.set("ch", state.selectedChampionId);
  }
  if (state.category === "rune" && state.selectedRuneId) {
    params.set("r", state.selectedRuneId);
  }
  if (state.category === "summoner_spell" && state.selectedSummonerId) {
    params.set("s", state.selectedSummonerId);
  }
  if (state.category === "item") {
    if (state.itemTier !== "starter") {
      params.set("t", state.itemTier);
    }
    if (state.selectedItemId) {
      params.set("i", state.selectedItemId);
    }
  }
  if (!state.category && state.selectedSearchKey) {
    params.set("e", state.selectedSearchKey);
  }

  const next = params.toString();
  const url = next ? `?${next}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

function renderTabs() {
  elements.categoryTabs.innerHTML = "";

  for (const category of CATEGORIES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tab-button${state.category === category.id ? " active" : ""}`;
    const count = state.counts[category.countKey] ?? "—";
    button.textContent = `${category.label} (${count})`;
    button.addEventListener("click", () => {
      state.category = state.category === category.id ? "" : category.id;
      if (state.category !== "champion") {
        state.selectedChampionId = "";
      }
      if (state.category !== "rune") {
        state.selectedRuneId = "";
      }
      if (state.category !== "summoner_spell") {
        state.selectedSummonerId = "";
      }
      if (state.category !== "item") {
        state.selectedItemId = "";
        state.itemTier = "starter";
      }
      if (state.category) {
        state.selectedSearchKey = "";
      }
      syncUrl();
      renderTabs();
      renderResults();
    });
    elements.categoryTabs.appendChild(button);
  }
}

function isLanding() {
  return !state.category && !state.query;
}

function hideContentViews() {
  setActiveView("");
  elements.searchHits.innerHTML = "";
  elements.searchDetail.innerHTML = "";
  elements.searchSummary.textContent = "";
  elements.emptyState.classList.remove("visible");
}

function setActiveView(view) {
  elements.championView.classList.toggle("hidden", view !== "champion");
  elements.itemView.classList.toggle("hidden", view !== "item");
  elements.summonerView.classList.toggle("hidden", view !== "summoner");
  elements.runeView.classList.toggle("hidden", view !== "rune");
  elements.searchView.classList.toggle("hidden", view !== "search");
  elements.resultsBar.classList.toggle("hidden", view !== "error");
}

function renderResults() {
  hideHoverTip();
  document.body.classList.toggle("landing", isLanding());

  if (isLanding()) {
    hideContentViews();
    return;
  }

  if (state.category === "champion") {
    renderChampionView();
    return;
  }

  if (state.category === "item") {
    renderItemView();
    return;
  }

  if (state.category === "summoner_spell") {
    renderSummonerView();
    return;
  }

  if (state.category === "rune") {
    renderRuneView();
    return;
  }

  renderSearchView();
}

function entryKey(entry) {
  return `${entry.category}:${entry.id}`;
}

function renderSearchView() {
  const filtered = filterEntries(state.entries, state.query).sort((a, b) =>
    (a.en || "").localeCompare(b.en || "", "en"),
  );

  setActiveView("search");
  elements.searchHits.innerHTML = "";
  elements.searchDetail.innerHTML = "";

  elements.searchSummary.textContent = buildSummary(filtered.length);
  elements.emptyState.classList.toggle("visible", filtered.length === 0);

  if (
    state.selectedSearchKey &&
    !filtered.some((entry) => entryKey(entry) === state.selectedSearchKey)
  ) {
    state.selectedSearchKey = "";
    syncUrl();
  }

  for (const category of CATEGORIES) {
    const hits = filtered.filter((entry) => entry.category === category.id);
    if (hits.length === 0) {
      continue;
    }

    const group = document.createElement("section");
    group.className = "search-group";
    group.setAttribute("aria-label", category.label);

    const title = document.createElement("h2");
    title.className = "search-group-title";
    title.textContent = `${category.label} (${hits.length})`;
    group.appendChild(title);

    const list = document.createElement("div");
    list.className = "search-group-list";
    for (const entry of hits) {
      list.appendChild(createSearchHit(entry));
    }
    group.appendChild(list);
    elements.searchHits.appendChild(group);
  }

  const selected = filtered.find((entry) => entryKey(entry) === state.selectedSearchKey);
  elements.searchDetail.classList.toggle("hidden", !selected);
  if (selected) {
    elements.searchDetail.appendChild(createSearchDetail(selected));
    requestAnimationFrame(() => {
      elements.searchDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
}

function createSearchHit(entry) {
  const fragment = elements.searchHitTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".search-hit");
  const button = fragment.querySelector(".search-hit-main");
  const chip = fragment.querySelector(".chip");

  card.classList.toggle("selected", entryKey(entry) === state.selectedSearchKey);
  chip.textContent = CATEGORY_LABELS[entry.category] ?? entry.category;
  chip.className = `chip ${entry.category}`;
  setIcon(fragment.querySelector(".search-hit-icon"), entry);
  fragment.querySelector(".en").textContent = entry.en || "—";
  fragment.querySelector(".ko").textContent = entry.ko || "—";
  fragment.querySelector(".zh").textContent = entry.zh_TW || "—";

  button.addEventListener("click", () => {
    const key = entryKey(entry);
    state.selectedSearchKey = state.selectedSearchKey === key ? "" : key;
    syncUrl();
    renderSearchView();
  });

  return card;
}

function createSearchDetail(entry) {
  if (entry.category === "champion") {
    return createChampionDetail(entry);
  }
  if (entry.category === "item") {
    return createItemDetail(entry);
  }
  if (entry.category === "summoner_spell") {
    return createSummonerDetail(entry);
  }
  return createRuneDetail(entry);
}

function closeDetail() {
  if (!state.category) {
    state.selectedSearchKey = "";
    syncUrl();
    renderSearchView();
    return true;
  }
  return false;
}

function getChampions(query) {
  const champions = state.entries.filter((entry) => entry.category === "champion");
  const filtered = filterEntries(champions, query);
  return filtered.sort((a, b) => (a.en || "").localeCompare(b.en || "", "en"));
}

function renderChampionView() {
  const champions = getChampions(state.query);

  setActiveView("champion");

  elements.emptyState.classList.toggle("visible", champions.length === 0);

  if (
    state.selectedChampionId &&
    !champions.some((entry) => entry.id === state.selectedChampionId)
  ) {
    state.selectedChampionId = "";
    syncUrl();
  }

  elements.championGrid.innerHTML = "";
  for (const entry of champions) {
    elements.championGrid.appendChild(createChampionTile(entry));
  }

  const selected = champions.find((entry) => entry.id === state.selectedChampionId);
  elements.championDetail.innerHTML = "";
  elements.championDetail.classList.toggle("hidden", !selected);
  elements.championView.classList.toggle("has-selection", Boolean(selected));
  if (selected) {
    elements.championDetail.appendChild(createChampionDetail(selected));
    if (window.matchMedia("(max-width: 820px)").matches) {
      requestAnimationFrame(() => {
        elements.championDetail.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }
}

function getItems(query) {
  const items = state.entries.filter((entry) => entry.category === "item");
  const filtered = filterEntries(items, query);
  return filtered.sort((a, b) => (a.en || "").localeCompare(b.en || "", "en"));
}

function renderItemView() {
  const items = getItems(state.query);
  const tierCounts = Object.fromEntries(
    ITEM_TIERS.map((tier) => [
      tier.id,
      items.filter((entry) => (entry.item_tier || "basic") === tier.id).length,
    ]),
  );

  if (!tierCounts[state.itemTier]) {
    const fallback =
      ITEM_TIERS.find((tier) => tierCounts[tier.id] > 0)?.id ?? "legendary";
    if (state.itemTier !== fallback) {
      state.itemTier = fallback;
      syncUrl();
    }
  }

  const tierItems = items.filter(
    (entry) => (entry.item_tier || "basic") === state.itemTier,
  );

  setActiveView("item");

  elements.emptyState.classList.toggle("visible", tierItems.length === 0);

  if (state.selectedItemId && !tierItems.some((entry) => entry.id === state.selectedItemId)) {
    state.selectedItemId = "";
    syncUrl();
  }

  elements.itemTierTabs.innerHTML = "";
  for (const tier of ITEM_TIERS) {
    const count = tierCounts[tier.id] ?? 0;
    if (count === 0 && state.query) {
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = `item-tier-tab${state.itemTier === tier.id ? " active" : ""}`;
    button.textContent = `${tier.label} (${count})`;
    button.disabled = count === 0;
    button.addEventListener("click", () => {
      state.itemTier = tier.id;
      state.selectedItemId = "";
      syncUrl();
      renderItemView();
    });
    elements.itemTierTabs.appendChild(button);
  }

  elements.itemGrid.innerHTML = "";
  for (const entry of tierItems) {
    elements.itemGrid.appendChild(createItemTile(entry));
  }

  const selected = tierItems.find((entry) => entry.id === state.selectedItemId);
  elements.itemDetail.innerHTML = "";
  elements.itemDetail.classList.toggle("hidden", !selected);
  if (selected) {
    elements.itemDetail.appendChild(createItemDetail(selected));
    requestAnimationFrame(() => {
      elements.itemDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
}

function createItemTile(entry) {
  const fragment = elements.itemTileTemplate.content.cloneNode(true);
  const button = fragment.querySelector(".item-tile");
  const icon = fragment.querySelector(".item-tile-icon");

  button.classList.toggle("selected", entry.id === state.selectedItemId);
  setIcon(icon, entry);
  attachHoverTip(button, entry);

  button.addEventListener("click", () => {
    state.selectedItemId = state.selectedItemId === entry.id ? "" : entry.id;
    syncUrl();
    renderItemView();
  });

  return button;
}

function createItemDetail(entry) {
  const fragment = elements.itemDetailTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".item-detail-card");

  setIcon(fragment.querySelector(".item-detail-icon"), entry);
  fragment.querySelector(".item-detail-title.en").textContent = entry.en || "—";
  fragment.querySelector(".item-detail-subtitle .ko").textContent = entry.ko || "—";
  fragment.querySelector(".item-detail-subtitle .zh").textContent = entry.zh_TW || "—";

  const gold = fragment.querySelector(".item-gold");
  if (entry.gold) {
    gold.hidden = false;
    gold.textContent = `${Number(entry.gold).toLocaleString("en-US")} gold`;
  }

  bindTooltip(card, entry);

  fragment.querySelector(".item-detail-close").addEventListener("click", () => {
    if (closeDetail()) {
      return;
    }
    state.selectedItemId = "";
    syncUrl();
    renderItemView();
  });

  return card;
}

function getSummonerSpells(query) {
  const spells = state.entries.filter((entry) => entry.category === "summoner_spell");
  const filtered = filterEntries(spells, query);
  return filtered.sort((a, b) => (a.en || "").localeCompare(b.en || "", "en"));
}

function renderSummonerView() {
  const spells = getSummonerSpells(state.query);

  setActiveView("summoner");

  elements.emptyState.classList.toggle("visible", spells.length === 0);

  if (
    state.selectedSummonerId &&
    !spells.some((entry) => entry.id === state.selectedSummonerId)
  ) {
    state.selectedSummonerId = "";
    syncUrl();
  }

  elements.summonerGrid.innerHTML = "";
  for (const entry of spells) {
    elements.summonerGrid.appendChild(createSummonerTile(entry));
  }

  const selected = spells.find((entry) => entry.id === state.selectedSummonerId);
  elements.summonerDetail.innerHTML = "";
  elements.summonerDetail.classList.toggle("hidden", !selected);
  if (selected) {
    elements.summonerDetail.appendChild(createSummonerDetail(selected));
    requestAnimationFrame(() => {
      elements.summonerDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
}

function createSummonerTile(entry) {
  const fragment = elements.summonerTileTemplate.content.cloneNode(true);
  const button = fragment.querySelector(".summoner-tile");
  const icon = fragment.querySelector(".summoner-tile-icon");

  button.classList.toggle("selected", entry.id === state.selectedSummonerId);
  setIcon(icon, entry);
  attachHoverTip(button, entry);

  button.addEventListener("click", () => {
    state.selectedSummonerId = state.selectedSummonerId === entry.id ? "" : entry.id;
    syncUrl();
    renderSummonerView();
  });

  return button;
}

function createSummonerDetail(entry) {
  const fragment = elements.summonerDetailTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".summoner-detail-card");

  setIcon(fragment.querySelector(".summoner-detail-icon"), entry);
  fragment.querySelector(".summoner-detail-title.en").textContent = entry.en || "—";
  fragment.querySelector(".summoner-detail-subtitle .ko").textContent = entry.ko || "—";
  fragment.querySelector(".summoner-detail-subtitle .zh").textContent = entry.zh_TW || "—";

  fragment.querySelector(".summoner-detail-close").addEventListener("click", () => {
    if (closeDetail()) {
      return;
    }
    state.selectedSummonerId = "";
    syncUrl();
    renderSummonerView();
  });

  return card;
}

function getRunes(query) {
  const runes = state.entries.filter(
    (entry) => entry.category === "rune" && entry.rune_type === "rune",
  );
  return filterEntries(runes, query);
}

function runeSort(a, b) {
  return Number(a.slot_order || 0) - Number(b.slot_order || 0) || Number(a.id) - Number(b.id);
}

function renderRuneView() {
  const runes = getRunes(state.query);

  setActiveView("rune");

  elements.emptyState.classList.toggle("visible", runes.length === 0);

  if (state.selectedRuneId && !runes.some((entry) => entry.id === state.selectedRuneId)) {
    state.selectedRuneId = "";
    syncUrl();
  }

  elements.runeGroups.innerHTML = "";
  for (const treeId of RUNE_TREE_ORDER) {
    const treeRunes = runes
      .filter((entry) => entry.tree_id === treeId)
      .sort(runeSort);
    if (treeRunes.length === 0) {
      continue;
    }

    const treeSection = document.createElement("section");
    treeSection.className = "rune-tree-group";
    const sample = treeRunes[0];
    treeSection.setAttribute(
      "aria-label",
      [sample.tree_en, sample.tree_ko, sample.tree_zh_TW].filter(Boolean).join(" · "),
    );

    for (const slot of RUNE_SLOTS) {
      const slotRunes = treeRunes.filter((entry) => entry.slot === slot).sort(runeSort);
      if (slotRunes.length === 0) {
        continue;
      }

      const slotSection = document.createElement("div");
      slotSection.className = "rune-slot-group";

      const grid = document.createElement("div");
      grid.className = "rune-slot-grid";
      for (const entry of slotRunes) {
        grid.appendChild(createRuneTile(entry));
      }
      slotSection.appendChild(grid);
      treeSection.appendChild(slotSection);
    }

    elements.runeGroups.appendChild(treeSection);
  }

  const selected = runes.find((entry) => entry.id === state.selectedRuneId);
  elements.runeDetail.innerHTML = "";
  elements.runeDetail.classList.toggle("hidden", !selected);
  if (selected) {
    elements.runeDetail.appendChild(createRuneDetail(selected));
    requestAnimationFrame(() => {
      elements.runeDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
}

function createRuneTile(entry) {
  const fragment = elements.runeTileTemplate.content.cloneNode(true);
  const button = fragment.querySelector(".rune-tile");
  const icon = fragment.querySelector(".rune-tile-icon");

  button.classList.toggle("selected", entry.id === state.selectedRuneId);
  setIcon(icon, entry);
  attachHoverTip(button, entry);

  button.addEventListener("click", () => {
    state.selectedRuneId = state.selectedRuneId === entry.id ? "" : entry.id;
    syncUrl();
    renderRuneView();
  });

  return button;
}

function createRuneDetail(entry) {
  const fragment = elements.runeDetailTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".rune-detail-card");

  setIcon(fragment.querySelector(".rune-detail-icon"), entry);
  fragment.querySelector(".rune-detail-title.en").textContent = entry.en || "—";
  fragment.querySelector(".rune-detail-subtitle .ko").textContent = entry.ko || "—";
  fragment.querySelector(".rune-detail-subtitle .zh").textContent = entry.zh_TW || "—";

  bindTooltip(card, entry);

  fragment.querySelector(".rune-detail-close").addEventListener("click", () => {
    if (closeDetail()) {
      return;
    }
    state.selectedRuneId = "";
    syncUrl();
    renderRuneView();
  });

  return card;
}

function createChampionTile(entry) {
  const fragment = elements.championTileTemplate.content.cloneNode(true);
  const button = fragment.querySelector(".champion-tile");
  const icon = fragment.querySelector(".champion-tile-icon");

  button.classList.toggle("selected", entry.id === state.selectedChampionId);
  setIcon(icon, entry);
  attachHoverTip(button, entry);

  button.addEventListener("click", () => {
    state.selectedChampionId =
      state.selectedChampionId === entry.id ? "" : entry.id;
    syncUrl();
    renderChampionView();
  });

  return button;
}

function createChampionDetail(entry) {
  const fragment = elements.championDetailTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".champion-detail-card");

  setIcon(fragment.querySelector(".champion-detail-icon"), entry);
  fragment.querySelector(".champion-detail-title.en").textContent = entry.en || "—";
  fragment.querySelector(".champion-detail-subtitle .ko").textContent = entry.ko || "—";
  fragment.querySelector(".champion-detail-subtitle .zh").textContent = entry.zh_TW || "—";

  const spellsList = fragment.querySelector(".champion-spells-list");
  const spells = entry.spells ?? [];
  if (spells.length === 0) {
    fragment.querySelector(".champion-spells")?.remove();
  } else {
    for (const spell of spells) {
      spellsList.appendChild(createSpellRow(spell));
    }
  }

  fragment.querySelector(".champion-detail-close").addEventListener("click", () => {
    if (closeDetail()) {
      return;
    }
    state.selectedChampionId = "";
    syncUrl();
    renderChampionView();
  });

  return card;
}

function createSpellRow(spell) {
  const row = document.createElement("div");
  row.className = "champion-spell-row";

  const iconWrap = document.createElement("div");
  iconWrap.className = "champion-spell-icon-wrap";

  const icon = document.createElement("img");
  icon.className = "champion-spell-icon";
  icon.width = 48;
  icon.height = 48;
  icon.loading = "lazy";
  if (spell.icon) {
    icon.src = spell.icon;
    icon.alt = spell.en || spell.key || "";
  } else {
    icon.hidden = true;
  }

  const key = document.createElement("span");
  key.className = "champion-spell-key";
  key.textContent = spell.key || "?";

  iconWrap.append(icon, key);

  const names = document.createElement("div");
  names.className = "champion-spell-names";
  names.innerHTML = `
    <p class="spell-name-en">${escapeHtml(spell.en || "—")}</p>
    <p class="spell-name-local">${escapeHtml(spell.ko || "—")} · ${escapeHtml(spell.zh_TW || "—")}</p>
  `;

  row.append(iconWrap, names);
  return row;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function localizedDesc(entry) {
  return entry[`desc_${state.detailLang}`] || entry.desc_en || "";
}

function bindTooltip(card, entry) {
  const tooltip = card.querySelector(".entry-tooltip");
  const tabs = card.querySelector(".detail-lang-tabs");
  if (!tooltip || !tabs) {
    return;
  }

  const hasDesc = Boolean(entry.desc_en || entry.desc_ko || entry.desc_zh_TW);
  if (!hasDesc) {
    tabs.hidden = true;
    tooltip.hidden = true;
    return;
  }

  const render = () => {
    tooltip.innerHTML = localizedDesc(entry);
    tooltip.hidden = !tooltip.innerHTML;
    for (const button of tabs.querySelectorAll("[data-lang]")) {
      button.classList.toggle("active", button.dataset.lang === state.detailLang);
    }
  };

  for (const button of tabs.querySelectorAll("[data-lang]")) {
    button.addEventListener("click", () => {
      state.detailLang = button.dataset.lang;
      render();
    });
  }

  render();
}

function buildSummary(resultCount) {
  const categoryLabel =
    CATEGORIES.find((item) => item.id === state.category)?.label ?? "all categories";
  const queryLabel = state.query ? ` matching “${state.query}”` : "";
  return `${resultCount.toLocaleString()} result${resultCount === 1 ? "" : "s"} in ${categoryLabel}${queryLabel}`;
}

function filterEntries(entries, query, category = "") {
  const normalizedQuery = query.trim().toLowerCase();

  return entries.filter((entry) => {
    if (category && entry.category !== category) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return searchableFields(entry).some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    );
  });
}

function searchableFields(entry) {
  return [
    entry.id,
    entry.key,
    entry.en,
    entry.ko,
    entry.zh_TW,
    entry.title_en,
    entry.title_ko,
    entry.title_zh_TW,
    entry.tree_en,
    entry.tree_ko,
    entry.tree_zh_TW,
    entry.rune_type,
    entry.slot,
    entry.item_tier,
    CATEGORY_LABELS[entry.category],
    ...(entry.spells ?? []).flatMap((spell) => [spell.en, spell.ko, spell.zh_TW, spell.key]),
  ].filter(Boolean);
}

function setIcon(img, entry) {
  if (entry.icon) {
    img.src = entry.icon;
    img.alt = entry.en || entry.id || "";
    img.hidden = false;
  } else {
    img.removeAttribute("src");
    img.alt = "";
    img.hidden = true;
  }
}

function hoverTipElement() {
  let tip = document.getElementById("hover-tip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "hover-tip";
    tip.hidden = true;
    document.body.appendChild(tip);
  }
  return tip;
}

function attachHoverTip(button, entry) {
  const label = [entry.en, entry.ko, entry.zh_TW].filter(Boolean).join(" · ");
  button.setAttribute("aria-label", label || entry.id);
  button.addEventListener("mouseenter", () => showHoverTip(button, entry));
  button.addEventListener("mouseleave", hideHoverTip);
  button.addEventListener("focus", () => showHoverTip(button, entry));
  button.addEventListener("blur", hideHoverTip);
  button.addEventListener("click", hideHoverTip);
}

function showHoverTip(anchor, entry) {
  const tip = hoverTipElement();
  tip.innerHTML = `
    <strong>${escapeHtml(entry.en || "—")}</strong>
    <span>${escapeHtml(entry.ko || "—")} · ${escapeHtml(entry.zh_TW || "—")}</span>
  `;
  tip.hidden = false;

  const rect = anchor.getBoundingClientRect();
  const gap = 10;
  const tipRect = tip.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
  let top = rect.top - tipRect.height - gap;
  if (top < 8) {
    top = rect.bottom + gap;
  }

  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function hideHoverTip() {
  const tip = document.getElementById("hover-tip");
  if (tip) {
    tip.hidden = true;
  }
}
