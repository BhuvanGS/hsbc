(function () {
  const STATUS = {
    PLANNING: 'Planning',
    IN_PROGRESS: 'In-Progress',
    COMPLETED: 'Completed',
  };

  const COLUMN_STATUS = {
    planning: STATUS.PLANNING,
    'in-progress': STATUS.IN_PROGRESS,
    completed: STATUS.COMPLETED,
  };

  const DEFAULT_PROJECTS = [
    {
      id: '1',
      projectName: 'Staff Portal',
      owner: 'Navneet',
      status: STATUS.PLANNING,
      startDate: '',
      endDate: '',
      assignedResource: 'Naveen',
      comments: '',
    },
    {
      id: '2',
      projectName: 'R & R Dashboard',
      owner: 'Saurabh',
      status: STATUS.PLANNING,
      startDate: '',
      endDate: '',
      assignedResource: 'Puja',
      comments: '',
    },
    {
      id: '3',
      projectName: 'Prime Tool Enhancement',
      owner: 'Sushovan',
      status: STATUS.PLANNING,
      startDate: '',
      endDate: '',
      assignedResource: 'Pavan',
      comments: '',
    },
    {
      id: '4',
      projectName: 'PCF Enhancement',
      owner: 'Sushovan',
      status: STATUS.IN_PROGRESS,
      startDate: '2024-08-12',
      endDate: '2024-08-16',
      assignedResource: 'Shambo',
      comments: '',
    },
    {
      id: '5',
      projectName: 'Overdue Reporting Automation',
      owner: 'Shambo',
      status: STATUS.COMPLETED,
      startDate: '2024-08-01',
      endDate: '2024-08-10',
      assignedResource: 'Naveen',
      comments: '',
    },
  ];

  let projects = [];
  let filterText = '';
  let draggedId = null;
  let editingId = null;
  let dropZonesBound = false;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function formatDisplayDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  function formatTableDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return iso;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}-${months[d.getMonth()]}`;
  }

  function todayIso() {
    const n = new Date();
    const y = n.getFullYear();
    const m = String(n.getMonth() + 1).padStart(2, '0');
    const d = String(n.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function nextId() {
    const nums = projects.map((p) => parseInt(p.id, 10)).filter((n) => !Number.isNaN(n));
    const max = nums.length ? Math.max(...nums) : 0;
    return String(max + 1);
  }

  function matchesFilter(project) {
    if (!filterText.trim()) return true;
    const q = filterText.trim().toLowerCase();
    const hay = [
      project.projectName,
      project.owner,
      project.status,
      project.assignedResource,
      project.comments,
      formatTableDate(project.startDate),
      formatTableDate(project.endDate),
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  }

  function visibleProjects() {
    return projects.filter(matchesFilter);
  }

  function statusToColumnKey(status) {
    if (status === STATUS.IN_PROGRESS) return 'in-progress';
    if (status === STATUS.COMPLETED) return 'completed';
    return 'planning';
  }

  function applyStatusDates(project, newStatus) {
    const updated = { ...project, status: newStatus };
    if (newStatus === STATUS.PLANNING) {
      updated.startDate = '';
      updated.endDate = '';
    } else if (newStatus === STATUS.IN_PROGRESS) {
      if (!updated.startDate) updated.startDate = todayIso();
      if (project.status === STATUS.PLANNING) {
        updated.endDate = '';
      }
    } else if (newStatus === STATUS.COMPLETED) {
      if (!updated.startDate) updated.startDate = todayIso();
      updated.endDate = todayIso();
    }
    return updated;
  }

  function showToast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
  }

  function renderCard(project) {
    const col = statusToColumnKey(project.status);
    const datesEl = document.createElement('div');
    datesEl.className = 'card-dates';

    if (project.status === STATUS.IN_PROGRESS && project.startDate) {
      datesEl.innerHTML = `Start<br>${formatDisplayDate(project.startDate)}<br><br>Expected<br>Closure<br>${formatDisplayDate(project.endDate) || '—'}`;
    } else if (project.status === STATUS.COMPLETED && project.startDate) {
      datesEl.innerHTML = `Start<br>${formatDisplayDate(project.startDate)}<br><br>Closed<br>${formatDisplayDate(project.endDate)}`;
    }

    const card = document.createElement('article');
    card.className = 'card';
    card.draggable = true;
    card.dataset.id = project.id;
    card.innerHTML = `
      <div class="card-main">
        <div class="card-title">${escapeHtml(project.projectName)}</div>
        <div class="card-meta">
          Owner: ${escapeHtml(project.owner)}<br>
          Stage: ${escapeHtml(project.status)}
        </div>
      </div>
    `;
    card.appendChild(datesEl);
    const edit = document.createElement('div');
    edit.className = 'card-edit';
    edit.innerHTML = '<a href="#" role="button">edit</a>';
    edit.querySelector('a').addEventListener('click', (e) => {
      e.preventDefault();
      openModal(project.id);
    });
    card.appendChild(edit);

    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragend', onDragEnd);
    card.addEventListener('dblclick', () => openModal(project.id));

    $(`.column.${col} .column-body`).appendChild(card);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderKanban() {
    $$('.column-body').forEach((body) => {
      body.innerHTML = '';
    });
    visibleProjects().forEach(renderCard);
  }

  function renderTable() {
    const tbody = $('#projects-table-body');
    tbody.innerHTML = '';
    const visibleIds = new Set(visibleProjects().map((p) => p.id));

    projects.forEach((project) => {
      const tr = document.createElement('tr');
      if (!visibleIds.has(project.id)) {
        tr.classList.add('filtered-out');
      }
      tr.innerHTML = `
        <td>${escapeHtml(project.projectName)}</td>
        <td>${escapeHtml(project.owner)}</td>
        <td>${escapeHtml(project.status)}</td>
        <td>${escapeHtml(formatTableDate(project.startDate))}</td>
        <td>${escapeHtml(formatTableDate(project.endDate))}</td>
        <td>${escapeHtml(project.assignedResource)}</td>
        <td>${escapeHtml(project.comments)}</td>
      `;
      tbody.appendChild(tr);
    });

    const emptyRows = Math.max(0, 8 - projects.length);
    for (let i = 0; i < emptyRows; i++) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td>';
      tbody.appendChild(tr);
    }
  }

  function render() {
    renderKanban();
    renderTable();
  }

  function onDragStart(e) {
    draggedId = e.currentTarget.dataset.id;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedId);
  }

  function onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    draggedId = null;
    $$('.column-body').forEach((b) => b.classList.remove('drag-over'));
  }

  function bindDropZones() {
    if (dropZonesBound) return;
    dropZonesBound = true;
    $$('.column-body').forEach((zone) => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        zone.classList.add('drag-over');
      });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain') || draggedId;
        if (!id) return;
        const column = zone.closest('.column');
        const columnKey = column.dataset.column;
        const newStatus = COLUMN_STATUS[columnKey];
        const idx = projects.findIndex((p) => p.id === id);
        if (idx === -1) return;
        projects[idx] = applyStatusDates(projects[idx], newStatus);
        render();
      });
    });
  }

  function openModal(id) {
    editingId = id;
    const project = id ? projects.find((p) => p.id === id) : null;
    $('#modal-title').textContent = project ? 'Edit Project' : 'Add New Project';
    $('#field-name').value = project ? project.projectName : '';
    $('#field-owner').value = project ? project.owner : '';
    $('#field-status').value = project ? project.status : STATUS.PLANNING;
    $('#field-start').value = project ? project.startDate : '';
    $('#field-end').value = project ? project.endDate : '';
    $('#field-resource').value = project ? project.assignedResource : '';
    $('#field-comments').value = project ? project.comments : '';
    $('#edit-modal').classList.add('open');
  }

  function closeModal() {
    $('#edit-modal').classList.remove('open');
    editingId = null;
  }

  function saveFromModal() {
    const payload = {
      projectName: $('#field-name').value.trim(),
      owner: $('#field-owner').value.trim(),
      status: $('#field-status').value,
      startDate: $('#field-start').value,
      endDate: $('#field-end').value,
      assignedResource: $('#field-resource').value.trim(),
      comments: $('#field-comments').value.trim(),
    };

    if (!payload.projectName) {
      showToast('Project name is required');
      return;
    }

    let record = editingId
      ? { ...projects.find((p) => p.id === editingId), ...payload }
      : { id: nextId(), ...payload };

    record = applyStatusDates(record, record.status);
    if (record.status === STATUS.IN_PROGRESS && !$('#field-start').value && record.startDate) {
      /* keep auto start from applyStatusDates */
    }
    if (record.status === STATUS.COMPLETED) {
      if ($('#field-end').value) record.endDate = $('#field-end').value;
    }

    const isUpdate = Boolean(editingId);
    if (editingId) {
      const idx = projects.findIndex((p) => p.id === editingId);
      if (idx !== -1) projects[idx] = record;
    } else {
      projects.push(record);
    }

    closeModal();
    render();
    showToast(isUpdate ? 'Project updated' : 'Project added');
  }

  async function refreshData(showMessage) {
    try {
      const res = await fetch('data/projects.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load');
      projects = await res.json();
      render();
      if (showMessage) showToast('Data refreshed');
    } catch {
      if (!projects.length) {
        projects = DEFAULT_PROJECTS.map((p) => ({ ...p }));
      }
      render();
      if (showMessage) showToast('Loaded local data (run a local server to refresh from JSON)');
    }
  }

  function bindEvents() {
    $('#btn-refresh').addEventListener('click', () => refreshData(true));
    $('#btn-add').addEventListener('click', () => openModal(null));
    $('#filter-input').addEventListener('input', (e) => {
      filterText = e.target.value;
      render();
    });
    $('#modal-save').addEventListener('click', saveFromModal);
    $('#modal-cancel').addEventListener('click', closeModal);
    $('#edit-modal').addEventListener('click', (e) => {
      if (e.target.id === 'edit-modal') closeModal();
    });
  }

  async function init() {
    bindDropZones();
    bindEvents();
    await refreshData(false);
  }

  init();
})();
