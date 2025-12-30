const params = new URLSearchParams(window.location.search);
const dataUrl = params.get('data') || '../../out/0911-orchestrator-status-ui/data.json';
const refreshMs = clampNumber(Number(params.get('refresh') || 4000), 2000, 5000);

const elements = {
  taskFilter: document.getElementById('taskFilter'),
  bucketFilter: document.getElementById('bucketFilter'),
  searchInput: document.getElementById('searchInput'),
  refreshBtn: document.getElementById('refreshBtn'),
  syncStatus: document.getElementById('syncStatus'),
  kpiActive: document.getElementById('kpi-active'),
  kpiOngoing: document.getElementById('kpi-ongoing'),
  kpiComplete: document.getElementById('kpi-complete'),
  kpiPending: document.getElementById('kpi-pending'),
  taskTableBody: document.getElementById('taskTableBody'),
  runDetail: document.getElementById('runDetail'),
  codebasePanel: document.getElementById('codebasePanel'),
  activityPanel: document.getElementById('activityPanel'),
  dataSource: document.getElementById('dataSource'),
  sideToggle: document.getElementById('sideToggle'),
  sidePanel: document.getElementById('sidePanel'),
  sideOverlay: document.getElementById('sideOverlay'),
  sideClose: document.getElementById('sideClose')
};

const state = {
  data: null,
  selectedTaskId: null,
  focusedTaskId: null,
  filters: {
    task: 'all',
    bucket: 'all',
    search: ''
  },
  loading: false,
  sideOpen: false
};

elements.dataSource.textContent = `Data source: ${dataUrl}`;

function selectRow(row) {
  if (!row || !row.dataset.taskId) {
    return false;
  }
  return selectTaskById(row.dataset.taskId, true);
}

function isSelectionKey(event) {
  return event.key === 'Enter' || event.key === ' ' || event.key === 'Space' || event.key === 'Spacebar';
}

function handleRowSelectionKey(event) {
  if (!isSelectionKey(event)) {
    return;
  }
  event.preventDefault();
  selectRow(event.currentTarget);
}

function selectTaskById(taskId, shouldFocus) {
  if (!taskId) {
    return false;
  }
  state.selectedTaskId = taskId;
  render();
  if (shouldFocus) {
    const safeId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(taskId) : taskId.replace(/"/g, '\\"');
    const row = elements.taskTableBody.querySelector(`tr[data-task-id="${safeId}"]`);
    if (row) {
      row.focus();
    }
  }
  return true;
}

elements.taskTableBody.addEventListener('click', (event) => {
  const row = event.target.closest('tr');
  selectRow(row);
});

elements.taskTableBody.addEventListener('focusin', (event) => {
  const row = event.target.closest('tr');
  if (!row || !row.dataset.taskId) {
    return;
  }
  state.focusedTaskId = row.dataset.taskId;
});

elements.taskFilter.addEventListener('change', (event) => {
  state.filters.task = event.target.value;
  if (state.filters.task !== 'all') {
    state.selectedTaskId = state.filters.task;
  }
  render();
});

elements.bucketFilter.addEventListener('change', (event) => {
  state.filters.bucket = event.target.value;
  render();
});

elements.searchInput.addEventListener('input', (event) => {
  state.filters.search = event.target.value;
  render();
});

elements.refreshBtn.addEventListener('click', () => {
  loadData();
});

elements.sideToggle.addEventListener('click', () => {
  toggleSidePanel();
});

elements.sideClose.addEventListener('click', () => {
  setSidePanelState(false);
});

elements.sideOverlay.addEventListener('click', () => {
  setSidePanelState(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.sideOpen) {
    setSidePanelState(false);
    return;
  }
  if (!isSelectionKey(event)) {
    return;
  }
  if (!state.focusedTaskId) {
    return;
  }
  event.preventDefault();
  selectTaskById(state.focusedTaskId, true);
});

setInterval(() => {
  loadData();
}, refreshMs);

loadData();

async function loadData() {
  if (state.loading) {
    return;
  }
  state.loading = true;
  setSyncStatus('Syncing...', true);
  try {
    const response = await fetch(dataUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load data (${response.status})`);
    }
    const payload = await response.json();
    state.data = payload;
    setSyncStatus(formatTimestamp(payload.generated_at), false);
  } catch (error) {
    setSyncStatus(error.message || 'Failed to load data', false, true);
  } finally {
    state.loading = false;
    render();
  }
}

function render() {
  if (!state.data) {
    renderEmpty();
    return;
  }

  const tasks = Array.isArray(state.data.tasks) ? state.data.tasks : [];
  const runs = Array.isArray(state.data.runs) ? state.data.runs : [];
  const activity = Array.isArray(state.data.activity) ? state.data.activity : [];

  renderKpis(tasks);
  renderTaskFilter(tasks);

  const filteredTasks = applyFilters(tasks);
  renderTaskTable(filteredTasks);

  const selectedTaskId = resolveSelectedTaskId(filteredTasks, tasks);
  state.selectedTaskId = selectedTaskId;
  const runMap = new Map(runs.map((run) => [run.task_id, run]));
  renderRunDetail(runMap.get(selectedTaskId), tasks.find((task) => task.task_id === selectedTaskId));
  renderCodebase(state.data.codebase);
  renderActivity(activity);
}

function renderEmpty() {
  elements.taskTableBody.innerHTML = '';
  elements.runDetail.innerHTML = '<div class="muted">No data loaded.</div>';
  elements.codebasePanel.innerHTML = '<div class="muted">No git data available.</div>';
  elements.activityPanel.innerHTML = '<div class="muted">No activity yet.</div>';
}

function renderKpis(tasks) {
  const counts = { active: 0, ongoing: 0, complete: 0, pending: 0 };
  tasks.forEach((task) => {
    if (counts[task.bucket] !== undefined) {
      counts[task.bucket] += 1;
    }
  });
  elements.kpiActive.textContent = counts.active;
  elements.kpiOngoing.textContent = counts.ongoing;
  elements.kpiComplete.textContent = counts.complete;
  elements.kpiPending.textContent = counts.pending;
}

function renderTaskFilter(tasks) {
  const current = elements.taskFilter.value || 'all';
  const options = ['all', ...tasks.map((task) => task.task_id)];
  elements.taskFilter.innerHTML = options
    .map((taskId) => {
      const label = taskId === 'all' ? 'All tasks' : taskId;
      const selected = taskId === current ? 'selected' : '';
      return `<option value="${escapeHtml(taskId)}" ${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function applyFilters(tasks) {
  const search = state.filters.search.trim().toLowerCase();
  return tasks.filter((task) => {
    if (state.filters.task !== 'all' && task.task_id !== state.filters.task) {
      return false;
    }
    if (state.filters.bucket !== 'all' && task.bucket !== state.filters.bucket) {
      return false;
    }
    if (!search) {
      return true;
    }
    const haystack = [task.task_id, task.title, task.status, task.summary]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(search);
  });
}

function resolveSelectedTaskId(filteredTasks, tasks) {
  if (filteredTasks.length === 0) {
    return tasks[0]?.task_id ?? null;
  }
  if (filteredTasks.some((task) => task.task_id === state.selectedTaskId)) {
    return state.selectedTaskId;
  }
  return filteredTasks[0].task_id;
}

function renderTaskTable(tasks) {
  elements.taskTableBody.innerHTML = tasks
    .map((task) => {
      const isSelected = task.task_id === state.selectedTaskId;
      const updated = formatTimestamp(task.last_update);
      return `<tr data-task-id="${escapeHtml(task.task_id)}" class="${isSelected ? 'selected' : ''}" tabindex="0" aria-selected="${isSelected}">
        <td>
          <span class="task-id">${escapeHtml(task.task_id)}</span>
          <span class="task-title">${escapeHtml(task.title || '')}</span>
        </td>
        <td>${bucketBadge(task.bucket)}</td>
        <td><span class="status-pill">${escapeHtml(task.status || 'unknown')}</span></td>
        <td>${escapeHtml(updated)}</td>
        <td>${Number(task.approvals_pending || 0)}</td>
        <td>${escapeHtml(task.summary || '—')}</td>
      </tr>`;
    })
    .join('');

  elements.taskTableBody.querySelectorAll('tr').forEach((row) => {
    row.addEventListener('keydown', handleRowSelectionKey);
    row.addEventListener('keyup', handleRowSelectionKey);
  });
}

function renderRunDetail(run, task) {
  if (!task) {
    elements.runDetail.innerHTML = '<div class="muted">Select a task to see run details.</div>';
    return;
  }

  if (!run) {
    elements.runDetail.innerHTML = `<div class="panel-body">
      <div class="key-value">
        <div class="key">Task</div>
        <div class="value">${escapeHtml(task.task_id)}</div>
        <div class="key">Bucket</div>
        <div class="value">${bucketBadge(task.bucket)}</div>
        <div class="key">Run</div>
        <div class="value">No run data yet.</div>
      </div>
    </div>`;
    return;
  }

  const stages = Array.isArray(run.stages) ? run.stages : [];
  const stageMarkup = stages.length
    ? `<div class="stage-list">${stages
        .map((stage) => {
          return `<div class="stage-item">
            <span class="stage-title">${escapeHtml(stage.title || stage.id)}</span>
            <span class="status-pill">${escapeHtml(stage.status || 'pending')}</span>
          </div>`;
        })
        .join('')}</div>`
    : '<div class="muted">No stage data available.</div>';

  const heartbeatLabel = run.heartbeat_at ? (run.heartbeat_stale ? 'Stale' : 'Fresh') : '—';

  elements.runDetail.innerHTML = `
    <div class="key-value">
      <div class="key">Task</div>
      <div class="value">${escapeHtml(task.task_id)}</div>
      <div class="key">Bucket</div>
      <div class="value">${bucketBadge(task.bucket)}</div>
      <div class="key">Run</div>
      <div class="value">${escapeHtml(run.run_id || 'unknown')}</div>
      <div class="key">Status</div>
      <div class="value"><span class="status-pill">${escapeHtml(run.status || 'unknown')}</span></div>
      <div class="key">Started</div>
      <div class="value">${escapeHtml(formatTimestamp(run.started_at))}</div>
      <div class="key">Updated</div>
      <div class="value">${escapeHtml(formatTimestamp(run.updated_at))}</div>
      <div class="key">Completed</div>
      <div class="value">${escapeHtml(formatTimestamp(run.completed_at))}</div>
      <div class="key">Approvals</div>
      <div class="value">${Number(run.approvals_pending || 0)} pending</div>
      <div class="key">Heartbeat</div>
      <div class="value">${heartbeatLabel}</div>
    </div>
    <div>
      <div class="panel-header">Stages</div>
      ${stageMarkup}
    </div>
    <div>
      <div class="panel-header">Links</div>
      <div class="key-value">
        <div class="key">Manifest</div>
        <div class="value">${escapeHtml(run.links?.manifest || '—')}</div>
        <div class="key">Metrics</div>
        <div class="value">${escapeHtml(run.links?.metrics || '—')}</div>
        <div class="key">State</div>
        <div class="value">${escapeHtml(run.links?.state || '—')}</div>
      </div>
    </div>
  `;
}

function renderCodebase(codebase) {
  if (!codebase) {
    elements.codebasePanel.innerHTML = '<div class="muted">Git metadata unavailable.</div>';
    return;
  }

  elements.codebasePanel.innerHTML = `
    <div class="key-value">
      <div class="key">Branch</div>
      <div class="value">${escapeHtml(codebase.branch || 'unknown')}</div>
      <div class="key">Head</div>
      <div class="value">${escapeHtml(codebase.head_sha || 'unknown')}</div>
      <div class="key">Last commit</div>
      <div class="value">${escapeHtml(codebase.last_commit?.subject || 'unknown')}</div>
      <div class="key">Author</div>
      <div class="value">${escapeHtml(codebase.last_commit?.author || 'unknown')}</div>
      <div class="key">Timestamp</div>
      <div class="value">${escapeHtml(formatTimestamp(codebase.last_commit?.timestamp))}</div>
      <div class="key">Dirty</div>
      <div class="value">${codebase.dirty ? 'Yes' : 'No'}</div>
      <div class="key">Changes</div>
      <div class="value">${Number(codebase.staged_count || 0)} staged, ${Number(
    codebase.unstaged_count || 0
  )} unstaged, ${Number(codebase.untracked_count || 0)} untracked</div>
      <div class="key">Diff</div>
      <div class="value">${Number(codebase.diff_stat?.files || 0)} files, +${Number(
    codebase.diff_stat?.additions || 0
  )} / -${Number(codebase.diff_stat?.deletions || 0)}</div>
    </div>
  `;
}

function renderActivity(activity) {
  if (!activity.length) {
    elements.activityPanel.innerHTML = '<div class="muted">No recent activity.</div>';
    return;
  }

  elements.activityPanel.innerHTML = `<div class="activity-list">${activity
    .map((event) => {
      return `<div class="activity-item">
        <div class="activity-time">${escapeHtml(formatTimestamp(event.ts))}</div>
        <div>${escapeHtml(event.message || 'Event')}</div>
      </div>`;
    })
    .join('')}</div>`;
}

function toggleSidePanel() {
  setSidePanelState(!state.sideOpen);
}

function setSidePanelState(isOpen) {
  state.sideOpen = isOpen;
  document.body.classList.toggle('side-open', isOpen);
  elements.sidePanel.classList.toggle('open', isOpen);
  elements.sideOverlay.classList.toggle('open', isOpen);
  elements.sidePanel.setAttribute('aria-hidden', String(!isOpen));
  elements.sideToggle.setAttribute('aria-expanded', String(isOpen));
}

function bucketBadge(bucket) {
  const safe = bucket || 'pending';
  return `<span class="badge ${escapeHtml(safe)}">${escapeHtml(safe)}</span>`;
}

function setSyncStatus(message, isSyncing, isError = false) {
  const prefix = isSyncing ? 'Syncing' : 'Last update';
  const text = isSyncing ? `${prefix}` : message;
  elements.syncStatus.textContent = text;
  elements.syncStatus.dataset.state = isError ? 'error' : isSyncing ? 'syncing' : 'ok';
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return '—';
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}
