(() => {
  'use strict';
  const storageKey = 'mana-ikdiena-design-v1';
  const root = document.documentElement;
  const panel = document.querySelector('.settings-panel');
  if (!panel) return;

  const sections = [
    ['page', 'Lapas fons', '#f5f6f4', '#142129'],
    ['header', 'Augšējā josla', '#fcfdfc', '#1d2a31'],
    ['motivation', 'Dienas impulss', '#f7f2e9', '#2d2c2a'],
    ['main', 'Uzdevumu saraksta panelis', '#ffffff', '#1d2a31'],
    ['categories', 'Kategoriju panelis', '#ffffff', '#1d2a31'],
    ['sidebar', 'Kalendāra un progresa panelis', '#ffffff', '#1d2a31'],
    ['priority', 'Prioritāšu sadaļa', '#fff9f5', '#352f2c'],
    ['regular', 'Pārējo darbu sadaļa', '#f7fafb', '#253840'],
    ['tasks', 'Uzdevumu kartītes', '#fcfdfd', '#23323a'],
    ['form', 'Uzdevuma pievienošanas logs', '#f7faf9', '#1d2a31'],
    ['notes', 'Piezīmes', '#fffdf5', '#283940'],
    ['namedays', 'Vārdadienas', '#fff8ec', '#342e29'],
    ['buttons', 'Pogas', '#f5f8f9', '#30424b'],
    ['accent', 'Aktīvās pogas un progress', '#2f6675', '#5d93a2'],
    ['text', 'Pamatteksts', '#23313d', '#eef3f5']
  ];
  const sectionKeys = new Set(sections.map(([key]) => key));
  const fonts = {
    default: '',
    system: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    arial: 'Arial, Helvetica, sans-serif',
    verdana: 'Verdana, Geneva, sans-serif',
    tahoma: 'Tahoma, Geneva, sans-serif',
    georgia: 'Georgia, "Times New Roman", serif'
  };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch {}
  const settings = {
    font: Object.hasOwn(fonts, saved.font) ? saved.font : 'default',
    size: Number.isInteger(saved.size) && saved.size >= 14 && saved.size <= 22 ? saved.size : 16,
    density: ['normal', 'compact', 'roomy'].includes(saved.density) ? saved.density : 'normal',
    corners: Number.isInteger(saved.corners) && saved.corners >= 8 && saved.corners <= 24 ? saved.corners : 16,
    colors: {}
  };
  for (const [key] of sections) {
    const value = saved.colors?.[key];
    if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) settings.colors[key] = value;
  }

  const details = document.createElement('details');
  details.className = 'sideblock design-settings';
  details.id = 'designSettings';
  const summary = document.createElement('summary');
  summary.textContent = 'Dizaina pielāgošana';
  details.append(summary);
  const content = document.createElement('div');
  content.className = 'design-settings-content';
  details.append(content);
  panel.querySelector('summary').insertAdjacentElement('afterend', details);

  const addHeading = title => {
    const heading = document.createElement('h4');
    heading.textContent = title;
    content.append(heading);
  };
  const addSelect = (label, key, options) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'design-control';
    wrapper.textContent = label;
    const select = document.createElement('select');
    select.id = 'design-' + key;
    for (const [value, text] of options) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.append(option);
    }
    select.value = settings[key];
    select.addEventListener('change', () => {
      settings[key] = select.value;
      apply(); persist();
    });
    wrapper.append(select);
    content.append(wrapper);
  };
  const addRange = (label, key, min, max, suffix) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'design-control';
    const title = document.createElement('span');
    const output = document.createElement('output');
    output.textContent = settings[key] + suffix;
    title.textContent = label + ' ';
    title.append(output);
    const input = document.createElement('input');
    input.id = 'design-' + key;
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = '1';
    input.value = settings[key];
    input.addEventListener('input', () => {
      settings[key] = Number(input.value);
      output.textContent = input.value + suffix;
      apply(); persist();
    });
    wrapper.append(title, input);
    content.append(wrapper);
  };

  addHeading('Teksts un izkārtojums');
  addSelect('Fonts', 'font', [
    ['default', 'Noklusētais'], ['system', 'Sistēmas fonts'], ['arial', 'Arial'],
    ['verdana', 'Verdana'], ['tahoma', 'Tahoma'], ['georgia', 'Georgia']
  ]);
  addRange('Teksta lielums', 'size', 14, 22, ' px');
  addSelect('Atstarpes', 'density', [
    ['normal', 'Parastās'], ['compact', 'Mazākas'], ['roomy', 'Plašākas']
  ]);
  addRange('Stūru noapaļojums', 'corners', 8, 24, ' px');
  addHeading('Sadaļu krāsas');
  const grid = document.createElement('div');
  grid.className = 'design-color-grid';
  content.append(grid);
  const colorInputs = new Map();
  for (const [key, label, light, dark] of sections) {
    const row = document.createElement('div');
    row.className = 'design-color-row';
    const name = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'color';
    input.id = 'design-color-' + key;
    input.value = settings.colors[key] || (root.dataset.theme === 'dark' ? dark : light);
    name.htmlFor = input.id;
    name.textContent = label;
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = '↺';
    reset.title = 'Atjaunot sākotnējo krāsu: ' + label;
    reset.setAttribute('aria-label', reset.title);
    reset.disabled = !settings.colors[key];
    input.addEventListener('input', () => {
      settings.colors[key] = input.value;
      reset.disabled = false;
      apply(); persist();
    });
    reset.addEventListener('click', () => {
      delete settings.colors[key];
      input.value = root.dataset.theme === 'dark' ? dark : light;
      reset.disabled = true;
      apply(); persist();
    });
    row.append(name, input, reset);
    grid.append(row);
    colorInputs.set(key, { input, light, dark });
  }
  const resetAll = document.createElement('button');
  resetAll.type = 'button';
  resetAll.id = 'designReset';
  resetAll.textContent = 'Atjaunot sākotnējo dizainu';
  resetAll.addEventListener('click', () => {
    settings.font = 'default'; settings.size = 16;
    settings.density = 'normal'; settings.corners = 16;
    settings.colors = {};
    content.querySelector('#design-font').value = 'default';
    content.querySelector('#design-density').value = 'normal';
    for (const key of ['size', 'corners']) {
      const input = content.querySelector('#design-' + key);
      input.value = settings[key];
      input.closest('label').querySelector('output').textContent = settings[key] + (key === 'size' ? ' px' : ' px');
    }
    for (const [key, {input, light, dark}] of colorInputs) {
      input.value = root.dataset.theme === 'dark' ? dark : light;
      input.nextElementSibling.disabled = true;
    }
    apply(); persist();
  });
  content.append(resetAll);

  function inkFor(hex) {
    const values = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    const luminance = .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
    return luminance > .179 ? '#17242b' : '#ffffff';
  }
  function apply() {
    root.toggleAttribute('data-design-font', settings.font !== 'default');
    root.style.setProperty('--design-font', fonts[settings.font] || 'Arial, Helvetica, sans-serif');
    root.toggleAttribute('data-design-size', settings.size !== 16);
    root.style.setProperty('--design-size', settings.size + 'px');
    root.dataset.designDensity = settings.density;
    root.toggleAttribute('data-design-corners', settings.corners !== 16);
    root.style.setProperty('--design-corners', settings.corners + 'px');
    for (const [key] of sections) {
      if (!sectionKeys.has(key)) continue;
      const color = settings.colors[key];
      const attribute = 'data-design-' + key;
      root.toggleAttribute(attribute, !!color);
      if (color) {
        root.style.setProperty('--design-' + key, color);
        root.style.setProperty('--design-' + key + '-ink', inkFor(color));
      } else {
        root.style.removeProperty('--design-' + key);
        root.style.removeProperty('--design-' + key + '-ink');
      }
    }
  }
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch {}
  }
  new MutationObserver(() => {
    for (const [key, {input, light, dark}] of colorInputs) {
      if (!settings.colors[key]) input.value = root.dataset.theme === 'dark' ? dark : light;
    }
  }).observe(root, {attributes:true, attributeFilter:['data-theme']});
  apply();
})();
