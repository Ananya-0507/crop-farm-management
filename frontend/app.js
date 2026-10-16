async function api(path, options) {
  const r = await fetch(API + path, options);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function renderNav(active) {
  const links = [['index.html', 'Dashboard'], ['farmers.html', 'Farmers'],
    ['fields.html', 'Fields'], ['plantings.html', 'Plantings'], ['harvests.html', 'Harvests']];
  document.getElementById('nav').innerHTML = links.map(([h, t]) =>
    `<a href="${h}" class="${h === active ? 'active' : ''}">${t}</a>`).join('');
}

async function initPage(cfg) {
  renderNav(cfg.page);
  document.getElementById('title').textContent = cfg.title;
  const maps = {};
  const msg = (text, isErr) => {
    const m = document.getElementById('msg');
    m.textContent = text;
    m.className = isErr ? 'err' : 'ok';
  };

  // Load options for dropdowns that point to other collections
  for (const f of cfg.fields) {
    if (f.optionsFrom) {
      const rows = await api(f.optionsFrom.endpoint);
      f.options = rows.map(r => ({ value: r._id, label: f.optionsFrom.label(r) }));
      maps[f.name] = Object.fromEntries(f.options.map(o => [o.value, o.label]));
    }
  }

  // Build the form
  const form = document.getElementById('form');
  form.innerHTML = cfg.fields.map(f => {
    if (f.options) {
      return `<label>${f.label}<select name="${f.name}" required>
        <option value="">-- choose --</option>
        ${f.options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
      </select></label>`;
    }
    return `<label>${f.label}<input name="${f.name}" type="${f.type || 'text'}"
      ${f.step ? `step="${f.step}"` : ''} required></label>`;
  }).join('') + '<br><button type="submit">Add</button>';

  // Load and show the table
  async function load() {
    const rows = await api(cfg.endpoint);
    document.getElementById('thead').innerHTML =
      '<tr>' + cfg.columns.map(c => `<th>${c.label}</th>`).join('') + '<th>Action</th></tr>';
    document.getElementById('tbody').innerHTML = rows.map(r =>
      '<tr>' + cfg.columns.map(c => `<td>${c.get(r, maps) ?? ''}</td>`).join('') +
      `<td><button class="danger" onclick="delRow('${r._id}')">Delete</button></td></tr>`
    ).join('') || '<tr><td colspan="9">No records yet.</td></tr>';
  }

  window.delRow = async (id) => {
    if (!confirm('Delete this record?')) return;
    try {
      await api(cfg.endpoint + '/' + id, { method: 'DELETE' });
      msg('Deleted');
      load();
    } catch (err) { msg(err.message, true); }
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    try {
      await api(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg.build(values))
      });
      form.reset();
      msg('Added successfully');
      load();
    } catch (err) { msg(err.message, true); }
  };

  load();
}