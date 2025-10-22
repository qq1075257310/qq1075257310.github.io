const DATA_URL = 'test.json';
const fieldNames = [
  'No',
  'Dex_No',
  'CN_Name',
  'ENG_Name',
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
  'Pre_Ball'
];

const state = {
  pokemonList: [],
  current: null,
  box: []
};

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

function fetchData() {
  return fetch(DATA_URL)
    .then((res) => {
      if (!res.ok) {
        throw new Error('无法读取 test.json');
      }
      return res.json();
    })
    .then((list) => {
      return list
        .map((entry) => ({ ...entry }))
        .sort((a, b) => Number(a.No) - Number(b.No));
    });
}

function fillForm(pokemon) {
  fieldNames.forEach((name) => {
    const field = form.elements.namedItem(name);
    if (!field) return;
    const value = pokemon?.[name] ?? '';
    field.value = value;
  });
}

function setCurrent(pokemon) {
  state.current = pokemon;
  fillForm(pokemon);
  currentNumber.textContent = pokemon?.No ?? '--';
  const displayName = pokemon?.CN_Name || pokemon?.ENG_Name || '未命名精灵';
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
    item.innerHTML = `
      <div>
        <p class="pokemon-number">#${pokemon.No.padStart(3, '0')}</p>
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
  const pokemon = state.pokemonList.find((item) => item.No === no);
  if (!pokemon) return;
  setCurrent({ ...pokemon });
  closeModal();
}

function collectFormData() {
  const formData = {};
  fieldNames.forEach((name) => {
    const field = form.elements.namedItem(name);
    if (!field) return;
    formData[name] = field.value.trim();
  });
  return formData;
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
      element.textContent = pokemon[key] || '--';
    });
    card.dataset.no = pokemon.No;
    const editBtn = card.querySelector('[data-action="edit"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');
    editBtn.addEventListener('click', () => {
      setCurrent({ ...pokemon });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    deleteBtn.addEventListener('click', () => {
      state.box = state.box.filter((item) => item.No !== pokemon.No || item !== pokemon);
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
  const existingIndex = state.box.findIndex((item) => item.No === formData.No);
  if (existingIndex >= 0) {
    state.box[existingIndex] = { ...formData };
  } else {
    state.box.push({ ...formData });
  }
  renderBox();
}

function handleSearch(event) {
  const value = event.target.value.trim().toLowerCase();
  if (!value) {
    renderSelectorList(state.pokemonList);
    return;
  }
  const results = state.pokemonList.filter((pokemon) => {
    return (
      pokemon.No.toLowerCase().includes(value) ||
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

function main() {
  updateDate();
  initModalClose();
  renderBox();
  fetchData()
    .then((list) => {
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
