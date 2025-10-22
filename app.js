const DATA_URL = 'test.json';
const BALL_LIST_URL = 'ball_list.txt';
const ITEM_LIST_URL = 'itemlist.txt';
const NATURE_LIST_URL = 'NatureList.txt';

const fieldNames = [
  'No',
  'Dex_No',
  'CN_Name',
  'ENG_Name',
  'Web_Name',
  'Gender_Type',
  'LV_Min',
  'Boss_LV_Min',
  'Move_Lv',
  'Move_TM',
  'Move_Boss',
  'Pre_Move1',
  'Pre_Move2',
  'Pre_Move3',
  'Pre_Move4',
  'Pre_Evs',
  'Pre_Nature',
  'Pre_Gender',
  'Pre_Ball',
  'Held_Item',
  'Body_Size',
  'Picture',
  'Ivs'
];

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const DEFAULT_EV_SPREAD = [0, 0, 0, 0, 0, 0];
const DEFAULT_IV_SPREAD = [31, 31, 31, 31, 31, 31];
const DEFAULT_BODY_SIZE = 255;
const DEFAULT_MIN_LEVEL = 1;
const DEFAULT_MAX_LEVEL = 100;
const DEFAULT_HELD_ITEM_ID = '1';
const DEFAULT_HELD_ITEM_NAME = '大师球';

const PICTURE_DIR = 'picture';
const PICTURE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'];

const state = {
  pokemonList: [],
  current: null,
  box: [],
  editingEntry: null,
  lists: {
    balls: [],
    items: [],
    natures: []
  }
};

let notificationTimeoutId = null;

function getDefaultHeldItemName() {
  const match = state.lists.items.find((item) => item.id === DEFAULT_HELD_ITEM_ID);
  return match?.name || DEFAULT_HELD_ITEM_NAME;
}

const form = document.getElementById('pokemonForm');
const currentNumber = document.getElementById('currentNumber');
const currentName = document.getElementById('currentName');
const statusDate = document.getElementById('statusDate');
const boxGrid = document.getElementById('boxGrid');
const boxEmpty = document.getElementById('boxEmpty');
const boxOrder = document.getElementById('boxOrder');
const selectorModal = document.getElementById('selectorModal');
const selectorList = document.getElementById('selectorList');
const selectorSearch = document.getElementById('selectorSearch');
const openSelectorBtn = document.getElementById('openSelector');
const saveToBoxBtn = document.getElementById('saveToBox');
const boxCardTemplate = document.getElementById('boxCardTemplate');
const fieldPreEvs = document.getElementById('fieldPreEvs');
const fieldIvs = document.getElementById('fieldIvs');
const fieldPicture = document.getElementById('fieldPicture');
const levelInput = document.getElementById('fieldLv');
const shinyToggle = document.getElementById('fieldShiny');
const bossToggle = document.getElementById('fieldBoss');
const chipShiny = document.querySelector('[data-chip="shiny"]');
const chipBoss = document.querySelector('[data-chip="boss"]');
const ballSelect = document.getElementById('fieldPreBall');
const itemSelect = document.getElementById('fieldHeldItem');
const natureSelect = document.getElementById('fieldPreNature');
const bodySizeInput = document.getElementById('fieldBodySize');
const spriteImage = document.getElementById('spriteImage');
const spritePlaceholder = document.getElementById('spritePlaceholder');
const evTotal = document.getElementById('evTotal');
const evWarning = document.getElementById('evWarning');
const notification = document.getElementById('notification');
const moveSelects = [
  document.getElementById('fieldPreMove1'),
  document.getElementById('fieldPreMove2'),
  document.getElementById('fieldPreMove3'),
  document.getElementById('fieldPreMove4')
];

const moveSelectPreviousValues = new Map();

const evInputs = STAT_KEYS.map((stat) => form.elements.namedItem(`ev_${stat}`));
const ivInputs = STAT_KEYS.map((stat) => form.elements.namedItem(`iv_${stat}`));

function updateDate() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  statusDate.textContent = formatter.format(now);
}

function fetchJson(url) {
  return fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error(`无法读取 ${url}`);
    }
    return res.json();
  });
}

function fetchText(url) {
  return fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error(`无法读取 ${url}`);
    }
    return res.text();
  });
}

function showNotification(message) {
  if (!notification) return;
  notification.textContent = message;
  notification.setAttribute('aria-hidden', 'false');
  notification.classList.add('is-visible');
  if (notificationTimeoutId) {
    clearTimeout(notificationTimeoutId);
  }
  notificationTimeoutId = window.setTimeout(() => {
    notification.classList.remove('is-visible');
    notification.setAttribute('aria-hidden', 'true');
    notificationTimeoutId = null;
  }, 2400);
}

function fetchData() {
  return fetchJson(DATA_URL).then((list) =>
    list
      .map((entry) => ({ ...entry }))
      .sort((a, b) => Number(a.No) - Number(b.No))
  );
}

function parseTableList(text, { skipHeader = true } = {}) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(skipHeader ? 1 : 0)
    .map((line) => {
      const [id, ...rest] = line.split(/\s+/);
      return {
        id: id || '',
        name: rest.join(' ') || id || ''
      };
    })
    .filter((item) => item.name);
}

function parseNatureList(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(1)
    .map((line) => {
      const [name] = line.split(/\s+/);
      return { name };
    })
    .filter((item) => item.name);
}

function parseMoveList(raw) {
  if (typeof raw !== 'string') {
    return [];
  }
  const parts = raw.split('-');
  const seen = new Set();
  const moves = [];
  parts.forEach((part) => {
    const name = part.trim();
    if (!name || seen.has(name)) {
      return;
    }
    seen.add(name);
    moves.push(name);
  });
  return moves;
}

function populateSelect(select, items, placeholder) {
  if (!select) return;
  const previousValue = select.value;
  select.innerHTML = '';
  const fragment = document.createDocumentFragment();
  if (placeholder) {
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    fragment.appendChild(placeholderOption);
  }
  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.name;
    option.textContent = item.name;
    fragment.appendChild(option);
  });
  select.appendChild(fragment);
  if (previousValue) {
    ensureOption(select, previousValue);
  }
}

function ensureOption(select, value) {
  if (!select || !value) return;
  const exists = Array.from(select.options).some((option) => option.value === value);
  if (!exists) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    option.dataset.dynamic = 'true';
    select.appendChild(option);
  }
  select.value = value;
}

function normaliseBodySize(value, { allowEmpty = false } = {}) {
  const raw = typeof value === 'string' ? value.trim() : value;
  if (allowEmpty && raw === '') {
    return '';
  }
  const numeric = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_BODY_SIZE.toString();
  }
  const clamped = Math.min(Math.max(numeric, 0), DEFAULT_BODY_SIZE);
  return clamped.toString();
}

function parseLevelValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return Number.NaN;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return Number.NaN;
  }
  const numeric = Number.parseInt(trimmed, 10);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

function getBaseMinLevel(pokemon) {
  const numeric = parseLevelValue(pokemon?.LV_Min);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_MIN_LEVEL;
  }
  const floored = Math.floor(numeric);
  return Math.min(Math.max(floored, DEFAULT_MIN_LEVEL), DEFAULT_MAX_LEVEL);
}

function getBossMinLevel(pokemon) {
  const base = getBaseMinLevel(pokemon);
  const numeric = parseLevelValue(pokemon?.Boss_LV_Min);
  if (!Number.isFinite(numeric)) {
    return base;
  }
  const floored = Math.floor(numeric);
  const adjusted = Math.max(floored, base, DEFAULT_MIN_LEVEL);
  return Math.min(adjusted, DEFAULT_MAX_LEVEL);
}

function getEffectiveMinLevel(pokemon) {
  const base = getBaseMinLevel(pokemon);
  if (bossToggle && bossToggle.checked) {
    return Math.max(base, getBossMinLevel(pokemon));
  }
  return base;
}

function clampLevelValue(value, minLevel) {
  const minimum = Number.isFinite(minLevel) ? minLevel : DEFAULT_MIN_LEVEL;
  let numeric = parseLevelValue(value);
  if (!Number.isFinite(numeric)) {
    numeric = minimum;
  }
  numeric = Math.floor(numeric);
  if (numeric < minimum) {
    numeric = minimum;
  }
  if (numeric < DEFAULT_MIN_LEVEL) {
    numeric = DEFAULT_MIN_LEVEL;
  }
  if (numeric > DEFAULT_MAX_LEVEL) {
    numeric = DEFAULT_MAX_LEVEL;
  }
  return numeric;
}

function updateLevelConstraints({ enforceValue = true } = {}) {
  if (!levelInput) {
    return;
  }
  const minimum = getEffectiveMinLevel(state.current);
  const clampedMin = Math.min(Math.max(minimum, DEFAULT_MIN_LEVEL), DEFAULT_MAX_LEVEL);
  levelInput.min = clampedMin.toString();
  levelInput.max = DEFAULT_MAX_LEVEL.toString();
  if (!enforceValue) {
    return;
  }
  const value = levelInput.value.trim();
  if (!value) {
    levelInput.value = clampedMin.toString();
    return;
  }
  const normalised = clampLevelValue(value, clampedMin);
  levelInput.value = normalised.toString();
}

function parseSpread(spread, fallback) {
  if (typeof spread !== 'string' || !spread.trim()) {
    return [...fallback];
  }
  const parts = spread.split(/[-,/]/);
  return STAT_KEYS.map((_, index) => {
    const raw = Number(parts[index]);
    return Number.isFinite(raw) ? raw : fallback[index];
  });
}

function applyEvSpread(spread) {
  const values = parseSpread(spread, DEFAULT_EV_SPREAD);
  evInputs.forEach((input, index) => {
    if (!input) return;
    input.value = values[index];
  });
  const fallbackInput = evInputs[evInputs.length - 1];
  updateEvState(fallbackInput);
}

function applyIvSpread(spread) {
  const values = parseSpread(spread, DEFAULT_IV_SPREAD);
  ivInputs.forEach((input, index) => {
    if (!input) return;
    input.value = values[index];
  });
  updateIvField();
}

function composeSpread(inputs) {
  return inputs.map((input) => Number(input?.value || 0)).join('-');
}

function updateEvState(changedInput) {
  let total = 0;
  evInputs.forEach((input) => {
    if (!input) return;
    let value = Number.parseInt(input.value, 10);
    if (!Number.isFinite(value) || value < 0) value = 0;
    if (value > 252) value = 252;
    input.value = value;
    total += value;
  });

  if (total > 510 && changedInput) {
    const others = total - Number(changedInput.value);
    const allowed = Math.max(0, 510 - others);
    changedInput.value = allowed;
    total = others + allowed;
  }

  evTotal.textContent = total;
  evWarning.hidden = total < 510;
  fieldPreEvs.value = composeSpread(evInputs);
}

function updateIvField() {
  ivInputs.forEach((input) => {
    if (!input) return;
    let value = Number.parseInt(input.value, 10);
    if (!Number.isFinite(value) || value < 0) value = 0;
    if (value > 31) value = 31;
    input.value = value;
  });
  fieldIvs.value = composeSpread(ivInputs);
}

function updateChips() {
  if (chipShiny && shinyToggle) {
    chipShiny.hidden = !shinyToggle.checked;
  }
  if (chipBoss && bossToggle) {
    chipBoss.hidden = !bossToggle.checked;
  }
}

function updateBodySizeControl() {
  if (!bodySizeInput) {
    return;
  }
  const isBoss = bossToggle ? bossToggle.checked : false;
  if (isBoss) {
    bodySizeInput.value = DEFAULT_BODY_SIZE.toString();
    bodySizeInput.disabled = true;
  } else {
    bodySizeInput.disabled = false;
    const shouldKeepEmpty = document.activeElement === bodySizeInput && bodySizeInput.value.trim() === '';
    bodySizeInput.value = shouldKeepEmpty
      ? ''
      : normaliseBodySize(bodySizeInput.value, { allowEmpty: true });
  }
}

let spriteLoadToken = 0;

function resolveSpriteSources(rawValue) {
  const value = (rawValue || '').trim();
  if (!value) {
    return [];
  }

  const isAbsoluteUrl = /^(https?:|data:|blob:)/i.test(value);
  const isRelativePath = value.startsWith('./') || value.startsWith('../') || value.startsWith('/');
  if (isAbsoluteUrl || isRelativePath) {
    return [value];
  }

  const numericWithExt = value.match(/^(\d+)\.(png|jpe?g|webp|gif|svg)$/i);
  if (numericWithExt) {
    const [, numberPart, ext] = numericWithExt;
    const extension = ext.toLowerCase();
    const normalised = numberPart.replace(/^0+/, '') || '0';
    const padded = numberPart.padStart(3, '0');
    const candidates = new Set();
    candidates.add(`${PICTURE_DIR}/${numberPart}.${extension}`);
    candidates.add(`${PICTURE_DIR}/${normalised}.${extension}`);
    candidates.add(`${PICTURE_DIR}/${padded}.${extension}`);
    return Array.from(candidates);
  }

  const numericOnly = value.match(/^\d+$/);
  if (numericOnly) {
    const numberPart = value;
    const normalised = numberPart.replace(/^0+/, '') || '0';
    const padded = numberPart.padStart(3, '0');
    const candidates = new Set();
    PICTURE_EXTENSIONS.forEach((ext) => {
      candidates.add(`${PICTURE_DIR}/${numberPart}.${ext}`);
      candidates.add(`${PICTURE_DIR}/${normalised}.${ext}`);
      candidates.add(`${PICTURE_DIR}/${padded}.${ext}`);
    });
    return Array.from(candidates);
  }

  if (!value.includes('.')) {
    return [`${PICTURE_DIR}/${value}`];
  }

  return [value];
}

function updateSprite(url) {
  if (!spriteImage && !spritePlaceholder) {
    return;
  }

  const currentToken = ++spriteLoadToken;
  const candidates = resolveSpriteSources(url);

  const showPlaceholder = () => {
    if (spriteImage) {
      spriteImage.src = '';
      spriteImage.hidden = true;
    }
    if (spritePlaceholder) {
      spritePlaceholder.hidden = false;
    }
  };

  if (!candidates.length) {
    showPlaceholder();
    return;
  }

  if (spriteImage) {
    spriteImage.hidden = true;
  }
  if (spritePlaceholder) {
    spritePlaceholder.hidden = false;
  }

  const tryLoad = (queue) => {
    if (currentToken !== spriteLoadToken) {
      return;
    }
    if (!queue.length) {
      showPlaceholder();
      return;
    }
    const [source, ...rest] = queue;
    const testImage = new Image();
    testImage.onload = () => {
      if (currentToken !== spriteLoadToken) {
        return;
      }
      if (spriteImage) {
        spriteImage.src = source;
        spriteImage.hidden = false;
      }
      if (spritePlaceholder) {
        spritePlaceholder.hidden = true;
      }
    };
    testImage.onerror = () => {
      tryLoad(rest);
    };
    testImage.src = source;
  };

  tryLoad([...candidates]);
}

function updateMoveSelectOptions(pokemon) {
  const levelMoves = parseMoveList(pokemon?.Move_Lv);
  const tmMoves = parseMoveList(pokemon?.Move_TM);
  const needsSeparator = levelMoves.length > 0 && tmMoves.length > 0;

  const buildOptions = (select, moves, category) => {
    moves.forEach((move) => {
      const option = document.createElement('option');
      option.value = move;
      option.textContent = move;
      option.dataset.category = category;
      select.appendChild(option);
    });
  };

  moveSelects.forEach((select, index) => {
    if (!select) return;
    const currentValue = pokemon?.[`Pre_Move${index + 1}`] || '';
    const previousValue = moveSelectPreviousValues.get(select) || '';

    select.innerHTML = '';
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = '选择技能';
    select.appendChild(placeholderOption);

    buildOptions(select, levelMoves, 'level');

    if (needsSeparator) {
      const separatorOption = document.createElement('option');
      separatorOption.value = '';
      separatorOption.textContent = '──────────';
      separatorOption.disabled = true;
      separatorOption.dataset.separator = 'true';
      select.appendChild(separatorOption);
    }

    buildOptions(select, tmMoves, 'tm');

    if (currentValue) {
      ensureOption(select, currentValue);
    }

    const fallbackValue = currentValue || previousValue || '';
    select.value = fallbackValue;
    moveSelectPreviousValues.set(select, fallbackValue);
  });
}

function syncMoveSelectPreviousValues() {
  moveSelects.forEach((select) => {
    if (!select) return;
    moveSelectPreviousValues.set(select, select.value || '');
  });
}

function handleMoveSelectChange(event) {
  const select = event.target;
  if (!select) return;
  const newValue = select.value;
  const previousValue = moveSelectPreviousValues.get(select) || '';

  if (!newValue) {
    moveSelectPreviousValues.set(select, '');
    return;
  }

  const hasDuplicate = moveSelects.some((other) => {
    if (!other || other === select) return false;
    return other.value === newValue;
  });

  if (hasDuplicate) {
    showNotification('不能选择相同技能！');
    const rollbackValue = previousValue || '';
    const exists = Array.from(select.options).some((option) => option.value === rollbackValue);
    if (!exists && rollbackValue) {
      ensureOption(select, rollbackValue);
    }
    select.value = rollbackValue;
    return;
  }

  moveSelectPreviousValues.set(select, newValue);
}

function initMoveSelectors() {
  moveSelects.forEach((select) => {
    if (!select) return;
    moveSelectPreviousValues.set(select, select.value || '');
    select.addEventListener('change', handleMoveSelectChange);
  });
}

function fillForm(pokemon) {
  fieldNames.forEach((name) => {
    const field = form.elements.namedItem(name);
    if (!field) return;
    const value = pokemon?.[name] ?? '';
    field.value = value;
  });

  if (bodySizeInput) {
    bodySizeInput.value = normaliseBodySize(pokemon?.Body_Size ?? bodySizeInput.value);
  }

  applyEvSpread(fieldPreEvs.value);
  applyIvSpread(fieldIvs.value);

  if (shinyToggle) {
    shinyToggle.checked = Boolean(pokemon?.Is_Shiny);
  }
  if (bossToggle) {
    bossToggle.checked = Boolean(pokemon?.Is_Boss);
  }
  updateChips();
  updateBodySizeControl();
  updateLevelConstraints();

  ensureOption(ballSelect, pokemon?.Pre_Ball ?? '');
  ensureOption(itemSelect, pokemon?.Held_Item ?? '');
  ensureOption(natureSelect, pokemon?.Pre_Nature ?? '');

  const spriteKey = pokemon?.Picture || pokemon?.No?.toString() || '';
  updateSprite(spriteKey);
}

function setCurrent(pokemon) {
  const enriched = {
    ...pokemon,
    Held_Item: pokemon?.Held_Item ?? getDefaultHeldItemName(),
    Body_Size: normaliseBodySize(pokemon?.Body_Size),
    Picture: pokemon?.Picture || pokemon?.No?.toString() || '',
    Ivs: pokemon?.Ivs ?? DEFAULT_IV_SPREAD.join('-'),
    Pre_Evs: pokemon?.Pre_Evs ?? DEFAULT_EV_SPREAD.join('-'),
    Is_Shiny: Boolean(pokemon?.Is_Shiny),
    Is_Boss: Boolean(pokemon?.Is_Boss)
  };

  state.current = enriched;
  updateMoveSelectOptions(enriched);
  fillForm(enriched);
  syncMoveSelectPreviousValues();

  const paddedNo = enriched?.No ? enriched.No.toString().padStart(3, '0') : '--';
  currentNumber.textContent = paddedNo;
  const displayName = enriched?.CN_Name || enriched?.ENG_Name || enriched?.Web_Name || '未命名精灵';
  currentName.textContent = displayName;
}

function openModal() {
  selectorModal.setAttribute('aria-hidden', 'false');
  selectorSearch.value = '';
  renderSelectorList(state.pokemonList);
  selectorSearch.focus({ preventScroll: true });
}

function closeModal() {
  selectorModal.setAttribute('aria-hidden', 'true');
}

function renderSelectorList(list) {
  selectorList.innerHTML = '';
  const fragment = document.createDocumentFragment();
  list.forEach((pokemon) => {
    const item = document.createElement('li');
    item.tabIndex = 0;
    item.dataset.no = pokemon.No;
    const padded = pokemon.No ? pokemon.No.toString().padStart(3, '0') : '--';
    item.innerHTML = `
      <div>
        <p class="pokemon-number">#${padded}</p>
        <p class="pokemon-name">${pokemon.CN_Name || pokemon.ENG_Name || '未知精灵'}</p>
      </div>
      <span class="pokemon-tag">Lv ${pokemon.LV_Min || '--'}</span>
    `;
    item.addEventListener('click', () => handleSelectPokemon(pokemon.No));
    item.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        handleSelectPokemon(pokemon.No);
      }
    });
    fragment.appendChild(item);
  });
  selectorList.appendChild(fragment);
}

function handleSelectPokemon(no) {
  const pokemon = state.pokemonList.find((item) => item.No?.toString() === no?.toString());
  if (!pokemon) return;
  state.editingEntry = null;
  setCurrent({ ...pokemon });
  closeModal();
}

function collectFormData() {
  updateLevelConstraints();
  const formData = new FormData(form);
  const base = { ...(state.current || {}) };
  const data = { ...base };
  fieldNames.forEach((name) => {
    const value = formData.get(name);
    if (value !== null) {
      data[name] = typeof value === 'string' ? value.trim() : '';
    } else if (!(name in data)) {
      data[name] = '';
    }
  });
  data.Pre_Evs = fieldPreEvs.value;
  data.Ivs = fieldIvs.value;
  const pictureValue = fieldPicture ? fieldPicture.value.trim() : '';
  data.Picture = pictureValue || data.Picture || data.No || state.current?.No?.toString() || '';
  data.No = data.No ? data.No.toString() : '';
  if (!data.CN_Name && state.current?.CN_Name) {
    data.CN_Name = state.current.CN_Name;
  }
  if (!data.ENG_Name && state.current?.ENG_Name) {
    data.ENG_Name = state.current.ENG_Name;
  }
  if (!data.Web_Name && state.current?.Web_Name) {
    data.Web_Name = state.current.Web_Name;
  }
  data.Is_Shiny = shinyToggle ? shinyToggle.checked : Boolean(data.Is_Shiny);
  data.Is_Boss = bossToggle ? bossToggle.checked : Boolean(data.Is_Boss);
  data.Body_Size = normaliseBodySize(bodySizeInput ? bodySizeInput.value : data.Body_Size);
  const minLevel = getEffectiveMinLevel(state.current);
  data.LV_Min = clampLevelValue(data.LV_Min, minLevel).toString();
  return data;
}

function renderBox() {
  const order = boxOrder.value;
  const sorted = [...state.box];
  if (order === 'asc') {
    sorted.sort((a, b) => Number(a.No) - Number(b.No));
  } else if (order === 'desc') {
    sorted.sort((a, b) => Number(b.No) - Number(a.No));
  } else if (order === 'name') {
    sorted.sort((a, b) => (a.CN_Name || a.ENG_Name || '').localeCompare(b.CN_Name || b.ENG_Name || ''));
  }

  boxGrid.innerHTML = '';
  if (sorted.length === 0) {
    boxEmpty.hidden = false;
    return;
  }
  boxEmpty.hidden = true;

  const fragment = document.createDocumentFragment();
  sorted.forEach((pokemon) => {
    const card = boxCardTemplate.content.firstElementChild.cloneNode(true);
    const fields = card.querySelectorAll('[data-field]');
    fields.forEach((element) => {
      const key = element.dataset.field;
      let value = pokemon[key];
      if (key === 'No') {
        value = value ? value.toString().padStart(3, '0') : '--';
      } else if (key === 'ENG_Name') {
        element.textContent = value || '';
        element.hidden = !value;
        return;
      } else if (!value && value !== 0) {
        value = '--';
      }
      element.textContent = value;
    });

    const shinyChip = card.querySelector('[data-tag="shiny"]');
    const bossChip = card.querySelector('[data-tag="boss"]');
    if (shinyChip) shinyChip.hidden = !pokemon.Is_Shiny;
    if (bossChip) bossChip.hidden = !pokemon.Is_Boss;

    card.dataset.no = pokemon.No;
    const editBtn = card.querySelector('[data-action="edit"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');
    editBtn.addEventListener('click', () => {
      state.editingEntry = pokemon;
      setCurrent({ ...pokemon });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    deleteBtn.addEventListener('click', () => {
      if (state.editingEntry === pokemon) {
        state.editingEntry = null;
      }
      state.box = state.box.filter((item) => item !== pokemon);
      renderBox();
    });
    fragment.appendChild(card);
  });
  boxGrid.appendChild(fragment);
}

function handleSaveToBox() {
  const formData = collectFormData();
  if (!formData.No) {
    return;
  }
  let isNewEntry = false;
  if (state.editingEntry && state.box.includes(state.editingEntry)) {
    Object.assign(state.editingEntry, formData);
  } else {
    const entry = { ...formData };
    state.box.push(entry);
    isNewEntry = true;
    state.editingEntry = null;
  }
  state.current = { ...(state.current || {}), ...formData };
  renderBox();
  if (isNewEntry) {
    showNotification('已成功添加到箱子');
  }
}

function handleSearch(event) {
  const value = event.target.value.trim().toLowerCase();
  if (!value) {
    renderSelectorList(state.pokemonList);
    return;
  }
  const results = state.pokemonList.filter((pokemon) => {
    const no = pokemon.No ? pokemon.No.toString().toLowerCase() : '';
    return (
      no.includes(value) ||
      (pokemon.CN_Name && pokemon.CN_Name.toLowerCase().includes(value)) ||
      (pokemon.ENG_Name && pokemon.ENG_Name.toLowerCase().includes(value))
    );
  });
  renderSelectorList(results);
}

function handleBoxOrderChange() {
  renderBox();
}

function initModalClose() {
  selectorModal.addEventListener('click', (event) => {
    if (event.target.hasAttribute('data-close')) {
      closeModal();
    }
  });
  selectorModal.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && selectorModal.getAttribute('aria-hidden') === 'false') {
      closeModal();
    }
  });
}

function initStatHandlers() {
  evInputs.forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => updateEvState(input));
    input.addEventListener('blur', () => updateEvState());
  });
  ivInputs.forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      updateIvField();
    });
  });
}

function initBodySizeControl() {
  if (!bodySizeInput) {
    return;
  }
  const handleInput = () => {
    bodySizeInput.value = normaliseBodySize(bodySizeInput.value, { allowEmpty: true });
  };
  const handleBlur = () => {
    if (bodySizeInput.value.trim() === '') {
      bodySizeInput.value = '0';
    } else {
      bodySizeInput.value = normaliseBodySize(bodySizeInput.value);
    }
  };
  bodySizeInput.addEventListener('input', handleInput);
  bodySizeInput.addEventListener('blur', handleBlur);
  updateBodySizeControl();
}

function initLevelControl() {
  if (!levelInput) {
    return;
  }
  levelInput.min = DEFAULT_MIN_LEVEL.toString();
  levelInput.max = DEFAULT_MAX_LEVEL.toString();
  levelInput.addEventListener('input', () => {
    const digitsOnly = levelInput.value.replace(/[^0-9]/g, '');
    if (digitsOnly !== levelInput.value) {
      levelInput.value = digitsOnly;
    }
  });
  levelInput.addEventListener('blur', () => {
    updateLevelConstraints();
  });
  updateLevelConstraints();
}

function initToggles() {
  shinyToggle?.addEventListener('change', updateChips);
  bossToggle?.addEventListener('change', () => {
    updateChips();
    updateBodySizeControl();
    updateLevelConstraints();
  });
}

function initPicturePreview() {
  if (fieldPicture) {
    const refresh = () => updateSprite(fieldPicture.value);
    fieldPicture.addEventListener('input', refresh);
    fieldPicture.addEventListener('change', refresh);
  }
  if (spriteImage) {
    spriteImage.addEventListener('error', () => {
      spriteImage.hidden = true;
      if (spritePlaceholder) {
        spritePlaceholder.hidden = false;
      }
    });
  }
}

function loadReferenceLists() {
  return Promise.all([
    fetchText(BALL_LIST_URL).then((text) => {
      const list = parseTableList(text);
      state.lists.balls = list;
      populateSelect(ballSelect, list);
    }),
    fetchText(ITEM_LIST_URL).then((text) => {
      const list = parseTableList(text);
      state.lists.items = list;
      populateSelect(itemSelect, list);
      if (itemSelect && !itemSelect.value && list.length > 0) {
        itemSelect.value = getDefaultHeldItemName();
      }
    }),
    fetchText(NATURE_LIST_URL).then((text) => {
      const list = parseNatureList(text);
      state.lists.natures = list;
      populateSelect(natureSelect, list);
    })
  ]);
}

function main() {
  updateDate();
  initModalClose();
  initStatHandlers();
  initBodySizeControl();
  initLevelControl();
  initToggles();
  initPicturePreview();
  initMoveSelectors();
  renderBox();

  Promise.all([loadReferenceLists(), fetchData()])
    .then(([, list]) => {
      state.pokemonList = list;
      if (list.length > 0) {
        const defaultPokemon = list.find((pokemon) => pokemon.No === '1') || list[0];
        setCurrent({ ...defaultPokemon });
      }
      renderSelectorList(list);
    })
    .catch((error) => {
      console.error(error);
    });

  openSelectorBtn.addEventListener('click', openModal);
  saveToBoxBtn.addEventListener('click', handleSaveToBox);
  selectorSearch.addEventListener('input', handleSearch);
  boxOrder.addEventListener('change', handleBoxOrderChange);
}

main();
