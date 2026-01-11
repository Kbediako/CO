const params = new URLSearchParams(window.location.search);
const runnerHosted = isRunnerHosted();
const dataUrl =
  params.get('data') || (runnerHosted ? '/ui/data.json' : '../../out/0911-orchestrator-status-ui/data.json');
const refreshMs = clampNumber(Number(params.get('refresh') || 4000), 2000, 5000);
const initialControlBase = runnerHosted ? window.location.origin : null;
const controlEnabled = Boolean(runnerHosted && initialControlBase);

const elements = {
  taskFilter: document.getElementById('taskFilter'),
  bucketFilter: document.getElementById('bucketFilter'),
  searchInput: document.getElementById('searchInput'),
  controlStatus: document.getElementById('controlStatus'),
  controlHint: document.getElementById('controlHint'),
  syncStatus: document.getElementById('syncStatus'),
  kpiActive: document.getElementById('kpi-active'),
  kpiOngoing: document.getElementById('kpi-ongoing'),
  kpiComplete: document.getElementById('kpi-complete'),
  kpiPending: document.getElementById('kpi-pending'),
  taskTableBody: document.getElementById('taskTableBody'),
  runDetail: document.getElementById('runDetail'),
  runOverlay: document.getElementById('runOverlay'),
  runModal: document.getElementById('runModal'),
  runClose: document.getElementById('runClose'),
  questionOverlay: document.getElementById('questionOverlay'),
  questionModal: document.getElementById('questionModal'),
  questionClose: document.getElementById('questionClose'),
  questionPrompt: document.getElementById('questionPrompt'),
  questionAnswer: document.getElementById('questionAnswer'),
  questionSubmit: document.getElementById('questionSubmit'),
  questionDismiss: document.getElementById('questionDismiss'),
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
  control: {
    enabled: controlEnabled,
    baseUrl: initialControlBase,
    token: '',
    session: runnerHosted,
    events: [],
    confirmations: [],
    questions: [],
    status: controlEnabled ? 'connecting' : 'disabled'
  },
  filters: {
    task: 'all',
    bucket: 'all',
    search: ''
  },
  loading: false,
  sideOpen: false,
  runOpen: false,
  questionOpen: false,
  sideReturnFocus: null,
  runReturnFocus: null,
  questionReturnFocus: null,
  activeQuestionId: null,
  activeQuestionPrompt: ''
};

let controlPollTimer = null;
let controlStreamAbort = null;
let controlReconnectTimer = null;

elements.dataSource.textContent = `Data source: ${dataUrl}`;
renderControlHeader();

function selectRow(row) {
  if (!row || !row.dataset.taskId) {
    return false;
  }
  const selected = selectTaskById(row.dataset.taskId, true);
  if (selected) {
    openRunModal();
  }
  return selected;
}

function isSelectionKey(event) {
  return event.key === 'Enter' || event.key === ' ' || event.key === 'Space' || event.key === 'Spacebar';
}

function isEditableTarget(target) {
  if (!target || target.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
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

elements.taskTableBody.addEventListener('focusout', (event) => {
  const nextFocus = event.relatedTarget;
  if (!nextFocus || !elements.taskTableBody.contains(nextFocus)) {
    state.focusedTaskId = null;
  }
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


elements.runClose.addEventListener('click', () => {
  setRunModalState(false);
});

elements.runOverlay.addEventListener('click', () => {
  setRunModalState(false);
});

if (elements.questionClose) {
  elements.questionClose.addEventListener('click', () => {
    setQuestionModalState(false);
  });
}

if (elements.questionOverlay) {
  elements.questionOverlay.addEventListener('click', () => {
    setQuestionModalState(false);
  });
}

if (elements.questionSubmit) {
  elements.questionSubmit.addEventListener('click', () => {
    submitQuestionAnswer();
  });
}

if (elements.questionDismiss) {
  elements.questionDismiss.addEventListener('click', () => {
    dismissActiveQuestion();
  });
}

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
  if (event.key === 'Tab') {
    if (state.questionOpen) {
      if (trapQuestionFocus(event)) {
        return;
      }
    } else {
      const containers = [];
      if (state.runOpen) {
        containers.push(elements.runModal);
      }
      if (state.sideOpen) {
        containers.push(elements.sidePanel);
      }
      if (trapFocus(event, containers)) {
        return;
      }
    }
  }
  if (event.key === 'Escape') {
    if (state.questionOpen) {
      setQuestionModalState(false);
      return;
    }
    if (state.runOpen) {
      setRunModalState(false);
      return;
    }
    if (state.sideOpen) {
      setSidePanelState(false);
      return;
    }
  }
  if (isEditableTarget(event.target)) {
    return;
  }
  if (!isSelectionKey(event)) {
    return;
  }
  if (!state.focusedTaskId) {
    return;
  }
  event.preventDefault();
  if (selectTaskById(state.focusedTaskId, true)) {
    openRunModal();
  }
});

setInterval(() => {
  loadData();
}, refreshMs);

loadData();
initControl();

async function loadData() {
  if (state.control.session && !state.control.token) {
    return;
  }
  if (state.loading) {
    return;
  }
  state.loading = true;
  setSyncStatus(null, true);
  try {
    const headers = buildDataHeaders();
    const response = await fetch(dataUrl, {
      cache: 'no-store',
      ...(headers ? { headers } : {})
    });
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

async function initControl() {
  stopControlSession();
  if (!state.control.enabled || !state.control.baseUrl) {
    state.control.status = 'disabled';
    render();
    return;
  }

  state.control.status = 'connecting';
  render();

  if (state.control.session) {
    const token = await fetchSessionToken();
    if (!token) {
      state.control.status = 'unauthorized';
      state.control.token = '';
      render();
      return;
    }
    state.control.token = token;
  }

  connectControlStream();
  controlPollTimer = setInterval(() => {
    loadControlData();
  }, 5000);
  loadControlData();
}

async function fetchSessionToken() {
  const url = buildControlUrl('/auth/session');
  if (!url) {
    render();
    return null;
  }
  try {
    const response = await fetch(url, { method: 'POST', cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    return typeof payload.token === 'string' ? payload.token : null;
  } catch {
    return null;
  }
}

async function loadControlData() {
  const confirmationsUrl = buildControlUrl('/confirmations');
  const questionsUrl = buildControlUrl('/questions');
  if (!confirmationsUrl || !questionsUrl) {
    return;
  }
  try {
    const headers = buildControlHeaders(false);
    const [confirmRes, questionRes] = await Promise.all([
      fetch(confirmationsUrl, { cache: 'no-store', headers }),
      fetch(questionsUrl, { cache: 'no-store', headers })
    ]);
    if (confirmRes.status === 401 || questionRes.status === 401) {
      await handleControlUnauthorized();
      return;
    }
    if (confirmRes.ok) {
      const payload = await confirmRes.json();
      state.control.confirmations = Array.isArray(payload.pending) ? payload.pending : [];
    }
    if (questionRes.ok) {
      const payload = await questionRes.json();
      state.control.questions = Array.isArray(payload.questions) ? payload.questions : [];
    }
    state.control.status = confirmRes.ok || questionRes.ok ? 'connected' : 'disconnected';
  } catch {
    state.control.status = 'disconnected';
  } finally {
    render();
  }
}

async function handleControlUnauthorized() {
  if (state.control.session) {
    await initControl();
    return;
  }
  state.control.status = 'unauthorized';
  state.control.token = '';
  render();
}

function buildControlUrl(pathname) {
  if (!state.control.baseUrl) {
    return null;
  }
  const rawBase = state.control.baseUrl.trim();
  if (!rawBase) {
    return null;
  }
  const normalizedBase = /^https?:\/\//i.test(rawBase) ? rawBase : `http://${rawBase}`;
  try {
    const url = new URL(pathname, normalizedBase);
    return url.toString();
  } catch {
    return null;
  }
}

function buildControlHeaders(includeCsrf) {
  const token = state.control.token;
  if (!token) {
    return {};
  }
  const headers = {
    Authorization: `Bearer ${token}`
  };
  if (includeCsrf) {
    headers['x-csrf-token'] = token;
  }
  return headers;
}

function buildDataHeaders() {
  if (!state.control.token) {
    return null;
  }
  try {
    const url = new URL(dataUrl, window.location.origin);
    if (url.origin === window.location.origin) {
      return buildControlHeaders(false);
    }
  } catch {
    // ignore
  }
  return null;
}


function stopControlSession() {
  state.control.token = '';
  if (controlPollTimer) {
    clearInterval(controlPollTimer);
    controlPollTimer = null;
  }
  if (controlReconnectTimer) {
    clearTimeout(controlReconnectTimer);
    controlReconnectTimer = null;
  }
  stopControlStream();
}

function stopControlStream() {
  if (controlStreamAbort) {
    controlStreamAbort.abort();
    controlStreamAbort = null;
  }
}

async function connectControlStream() {
  const eventUrl = buildControlUrl('/events');
  if (!eventUrl || !state.control.token) {
    return;
  }
  stopControlStream();

  const controller = new AbortController();
  controlStreamAbort = controller;
  const headers = buildControlHeaders(false);
  fetch(eventUrl, { cache: 'no-store', headers, signal: controller.signal })
    .then(async (response) => {
      if (!response.ok || !response.body) {
        if (!controller.signal.aborted) {
          if (response.status === 401 || response.status === 403) {
            await handleControlUnauthorized();
            return;
          }
          state.control.status = 'disconnected';
          render();
          scheduleControlReconnect();
        }
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      state.control.status = 'connected';
      render();

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          handleSseLine(line);
        }
      }

      if (!controller.signal.aborted) {
        state.control.status = 'disconnected';
        render();
        scheduleControlReconnect();
      }
    })
    .catch(() => {
      if (controller.signal.aborted) {
        return;
      }
      state.control.status = 'disconnected';
      render();
      scheduleControlReconnect();
    });
}

function scheduleControlReconnect() {
  if (!state.control.enabled) {
    return;
  }
  if (controlReconnectTimer) {
    clearTimeout(controlReconnectTimer);
  }
  controlReconnectTimer = setTimeout(() => {
    if (state.control.enabled) {
      connectControlStream();
    }
  }, 5000);
}

function handleSseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(':')) {
    return;
  }
  if (!trimmed.startsWith('data:')) {
    return;
  }
  const payload = trimmed.slice('data:'.length).trim();
  if (!payload) {
    return;
  }
  try {
    const parsed = JSON.parse(payload);
    state.control.events.unshift(parsed);
    state.control.events = state.control.events.slice(0, 120);
    render();
  } catch {
    // ignore parse errors
  }
}

async function sendControlAction(action) {
  if (action === 'cancel') {
    await requestCancel();
    return;
  }
  const url = buildControlUrl('/control/action');
  if (!url) {
    return;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildControlHeaders(true) },
    body: JSON.stringify({ action, requested_by: 'ui' })
  });
  if (response.status === 401 || response.status === 403) {
    state.control.status = 'unauthorized';
    render();
  }
}

async function requestCancel() {
  const url = buildControlUrl('/confirmations/create');
  if (!url) {
    return;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildControlHeaders(true) },
    body: JSON.stringify({ action: 'cancel', tool: 'ui.cancel', params: {} })
  });
  if (response.status === 401 || response.status === 403) {
    state.control.status = 'unauthorized';
    render();
  }
  loadControlData();
}

async function approveConfirmation(requestId) {
  const url = buildControlUrl('/confirmations/approve');
  if (!url) {
    return;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildControlHeaders(true) },
    body: JSON.stringify({ request_id: requestId, actor: 'ui' })
  });
  if (response.status === 401 || response.status === 403) {
    state.control.status = 'unauthorized';
    render();
  }
  loadControlData();
}

function answerQuestion(questionId) {
  const record = (state.control.questions || []).find((item) => item.question_id === questionId);
  state.activeQuestionId = questionId;
  state.activeQuestionPrompt = record?.prompt || '';
  if (elements.questionPrompt) {
    elements.questionPrompt.textContent = state.activeQuestionPrompt || 'No prompt provided.';
  }
  if (elements.questionAnswer) {
    elements.questionAnswer.value = '';
  }
  setQuestionModalState(true);
}

async function submitQuestionAnswer() {
  const questionId = state.activeQuestionId;
  if (!questionId) {
    return;
  }
  const url = buildControlUrl('/questions/answer');
  if (!url) {
    return;
  }
  const answer = elements.questionAnswer ? elements.questionAnswer.value : '';
  if (!answer) {
    return;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildControlHeaders(true) },
    body: JSON.stringify({ question_id: questionId, answer, answered_by: 'ui' })
  });
  if (response.status === 401 || response.status === 403) {
    state.control.status = 'unauthorized';
    render();
  }
  setQuestionModalState(false);
  loadControlData();
}

async function dismissQuestion(questionId) {
  const url = buildControlUrl('/questions/dismiss');
  if (!url) {
    return;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildControlHeaders(true) },
    body: JSON.stringify({ question_id: questionId, dismissed_by: 'ui' })
  });
  if (response.status === 401 || response.status === 403) {
    state.control.status = 'unauthorized';
    render();
  }
  loadControlData();
}

async function dismissActiveQuestion() {
  const questionId = state.activeQuestionId;
  if (!questionId) {
    return;
  }
  await dismissQuestion(questionId);
  setQuestionModalState(false);
}

function render() {
  renderControlHeader();
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

function renderControlHeader() {
  if (!elements.controlStatus) {
    return;
  }
  const label = formatControlStatus(state.control.status, state.control.enabled);
  elements.controlStatus.textContent = label;
  if (!elements.controlHint) {
    return;
  }
  if (!state.control.enabled) {
    elements.controlHint.textContent = 'Open the run at /ui to enable controls.';
    return;
  }
  if (state.control.status === 'unauthorized') {
    elements.controlHint.textContent = 'Session expired. Reconnecting...';
    return;
  }
  elements.controlHint.textContent = 'Session auth via the runner control plane.';
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
      const approvalsPending = Number(task.approvals_pending || 0);
      const approvalsTotal = Number(task.approvals_total || 0);
      const approvalsDisplay = approvalsPending > 0 ? approvalsPending : approvalsTotal;
      return `<tr data-task-id="${escapeHtml(task.task_id)}" class="${isSelected ? 'selected' : ''}" tabindex="0" aria-selected="${isSelected}">
        <td>
          <span class="task-id">${escapeHtml(task.task_id)}</span>
          <span class="task-title">${escapeHtml(task.title || '')}</span>
        </td>
        <td>${bucketBadge(task.bucket)}</td>
        <td><span class="status-pill">${escapeHtml(task.status || 'unknown')}</span></td>
        <td>${escapeHtml(updated)}</td>
        <td>${approvalsDisplay}</td>
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
  const approvalsPending = Number(run.approvals_pending || 0);
  const approvalsTotal = Number(run.approvals_total || 0);
  const approvalsLabel =
    approvalsTotal > 0 ? `${approvalsPending} pending / ${approvalsTotal} total` : `${approvalsPending} pending`;

  const controlMarkup = state.control.baseUrl ? buildControlMarkup(run) : '';

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
      <div class="value">${approvalsLabel}</div>
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
    ${controlMarkup}
  `;

  if (state.control.enabled && state.control.token) {
    wireControlHandlers();
  }
}

function buildControlMarkup(run) {
  const controlsDisabled = !state.control.enabled || !state.control.token;
  const events = state.control.events.slice(0, 12);
  const confirmations = state.control.confirmations || [];
  const questions = state.control.questions || [];
  const eventsMarkup = events.length
    ? `<div class="event-list">${events
        .map(
          (entry) => `<div class="event-item">
            <div class="event-meta">${escapeHtml(entry.event || 'event')}</div>
            <div class="event-time">${escapeHtml(formatTimestamp(entry.timestamp))}</div>
          </div>`
        )
        .join('')}</div>`
    : '<div class="muted">No events yet.</div>';

  const confirmationsMarkup = confirmations.length
    ? `<div class="control-list">${confirmations
        .map(
          (item) => `<div class="control-row">
            <div>
              <div class="control-title">${escapeHtml(item.action || item.tool || 'confirmation')}</div>
              <div class="muted small">${escapeHtml(item.request_id || '')}</div>
            </div>
            <button class="control-button" data-confirm-id="${escapeHtml(
              item.request_id || ''
            )}" ${controlsDisabled ? 'disabled' : ''}>Approve</button>
          </div>`
        )
        .join('')}</div>`
    : '<div class="muted">No confirmations pending.</div>';

  const questionsMarkup = questions.length
    ? `<div class="control-list">${questions
        .map(
          (item) => `<div class="control-row">
            <div>
              <div class="control-title">${escapeHtml(item.prompt || 'Question')}</div>
              <div class="muted small">${escapeHtml(item.question_id || '')} • ${escapeHtml(item.status || '')}</div>
            </div>
            <div class="control-actions-inline">
              <button class="control-button" data-question-id="${escapeHtml(
                item.question_id || ''
              )}" ${controlsDisabled ? 'disabled' : ''}>Answer</button>
              <button class="control-button subtle" data-question-dismiss-id="${escapeHtml(
                item.question_id || ''
              )}" ${controlsDisabled ? 'disabled' : ''}>Dismiss</button>
            </div>
          </div>`
        )
        .join('')}</div>`
    : '<div class="muted">No questions queued.</div>';

  return `
    <div>
      <div class="panel-header">Run Controls</div>
      <div class="control-actions">
        <button class="control-button" data-action="pause" ${controlsDisabled ? 'disabled' : ''}>Pause</button>
        <button class="control-button" data-action="resume" ${controlsDisabled ? 'disabled' : ''}>Resume</button>
        <button class="control-button danger" data-action="cancel" ${controlsDisabled ? 'disabled' : ''}>Cancel</button>
      </div>
      <div class="panel-subtle">Control status: ${escapeHtml(state.control.status || 'unknown')}</div>
      ${
        controlsDisabled
          ? '<div class="muted small">Open this run at /ui to enable controls.</div>'
          : ''
      }
    </div>
    <div>
      <div class="panel-header">Confirmations</div>
      ${confirmationsMarkup}
    </div>
    <div>
      <div class="panel-header">Questions</div>
      ${questionsMarkup}
    </div>
    <div>
      <div class="panel-header">Live Events</div>
      ${eventsMarkup}
    </div>
  `;
}

function wireControlHandlers() {
  const actionButtons = elements.runDetail.querySelectorAll('[data-action]');
  actionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action');
      if (action) {
        sendControlAction(action);
      }
    });
  });

  const confirmButtons = elements.runDetail.querySelectorAll('[data-confirm-id]');
  confirmButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const requestId = button.getAttribute('data-confirm-id');
      if (requestId) {
        approveConfirmation(requestId);
      }
    });
  });

  const questionButtons = elements.runDetail.querySelectorAll('[data-question-id]');
  questionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const questionId = button.getAttribute('data-question-id');
      if (questionId) {
        answerQuestion(questionId);
      }
    });
  });

  const dismissButtons = elements.runDetail.querySelectorAll('[data-question-dismiss-id]');
  dismissButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const questionId = button.getAttribute('data-question-dismiss-id');
      if (questionId) {
        dismissQuestion(questionId);
      }
    });
  });
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
  if (isOpen) {
    state.sideReturnFocus = captureActiveElement();
  } else {
    focusOutsideContainer(elements.sidePanel, state.sideReturnFocus, elements.sideToggle);
  }
  state.sideOpen = isOpen;
  document.body.classList.toggle('side-open', isOpen);
  elements.sidePanel.classList.toggle('open', isOpen);
  elements.sideOverlay.classList.toggle('open', isOpen);
  elements.sidePanel.setAttribute('aria-hidden', String(!isOpen));
  elements.sideToggle.setAttribute('aria-expanded', String(isOpen));
}

function openRunModal() {
  setRunModalState(true);
}

function setRunModalState(isOpen) {
  if (isOpen) {
    state.runReturnFocus = captureActiveElement();
  } else {
    const fallbackRow =
      elements.taskTableBody.querySelector('tr.selected') || elements.taskTableBody.querySelector('tr');
    focusOutsideContainer(elements.runModal, state.runReturnFocus, fallbackRow);
  }
  state.runOpen = isOpen;
  updateModalStateClass();
  elements.runModal.classList.toggle('open', isOpen);
  elements.runOverlay.classList.toggle('open', isOpen);
  elements.runModal.setAttribute('aria-hidden', String(!isOpen));
  elements.runOverlay.setAttribute('aria-hidden', String(!isOpen));
  if (isOpen) {
    elements.runClose.focus();
  }
}

function setQuestionModalState(isOpen) {
  if (isOpen) {
    state.questionReturnFocus = captureActiveElement();
  } else {
    focusOutsideContainer(elements.questionModal, state.questionReturnFocus, elements.runModal);
    state.activeQuestionId = null;
    state.activeQuestionPrompt = '';
    if (elements.questionAnswer) {
      elements.questionAnswer.value = '';
    }
    if (elements.questionPrompt) {
      elements.questionPrompt.textContent = '';
    }
  }
  state.questionOpen = isOpen;
  updateModalStateClass();
  elements.questionModal.classList.toggle('open', isOpen);
  elements.questionOverlay.classList.toggle('open', isOpen);
  elements.questionModal.setAttribute('aria-hidden', String(!isOpen));
  elements.questionOverlay.setAttribute('aria-hidden', String(!isOpen));
  if (isOpen && elements.questionAnswer) {
    elements.questionAnswer.focus();
  }
}

function updateModalStateClass() {
  document.body.classList.toggle('modal-open', state.runOpen || state.questionOpen);
}

function captureActiveElement() {
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

function focusOutsideContainer(container, preferred, fallback) {
  const candidates = [preferred, fallback];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate.focus !== 'function') {
      continue;
    }
    if (container && container.contains(candidate)) {
      continue;
    }
    if (!document.contains(candidate)) {
      continue;
    }
    candidate.focus();
    return;
  }
}

function trapQuestionFocus(event) {
  return trapFocus(event, elements.questionModal);
}

function trapFocus(event, containerOrContainers) {
  const containers = Array.isArray(containerOrContainers) ? containerOrContainers : [containerOrContainers];
  const container = containers[0];
  if (!container) {
    return false;
  }
  const focusable = containers.flatMap((candidate) => (candidate ? getFocusableElements(candidate) : []));
  if (focusable.length === 0) {
    return false;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (!containers.some((candidate) => candidate && candidate.contains(active))) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return true;
  }
  if (event.shiftKey) {
    if (active === first) {
      event.preventDefault();
      last.focus();
      return true;
    }
    return false;
  }
  if (active === last) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => el instanceof HTMLElement && !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
}

function bucketBadge(bucket) {
  const safe = bucket || 'pending';
  return `<span class="badge ${escapeHtml(safe)}">${escapeHtml(safe)}</span>`;
}

function setSyncStatus(message, isSyncing, isError = false) {
  const fallback = elements.syncStatus.textContent || '—';
  const text = message || (isError ? 'Failed to load data' : fallback);
  if (!isSyncing || isError) {
    elements.syncStatus.textContent = text;
  }
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

function formatControlStatus(status, enabled) {
  if (!enabled) {
    return 'Read-only';
  }
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting';
    case 'unauthorized':
      return 'Session expired';
    case 'disconnected':
      return 'Disconnected';
    case 'disabled':
      return 'Read-only';
    default:
      return status || 'Control';
  }
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

function isRunnerHosted() {
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
    return false;
  }
  return window.location.pathname.startsWith('/ui');
}
