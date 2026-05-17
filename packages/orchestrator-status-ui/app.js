const params = new URLSearchParams(window.location.search);
const runnerHosted = isRunnerHosted();
const dataUrl = resolveDataUrl();
const refreshMs = clampNumber(Number(params.get('refresh') || 4000), 2000, 15000);

const elements = {
  authBadge: document.getElementById('authBadge'),
  heroNote: document.getElementById('heroNote'),
  refreshButton: document.getElementById('refreshButton'),
  runningCount: document.getElementById('runningCount'),
  runningMeta: document.getElementById('runningMeta'),
  retryCount: document.getElementById('retryCount'),
  retryMeta: document.getElementById('retryMeta'),
  tokenTotal: document.getElementById('tokenTotal'),
  tokenMeta: document.getElementById('tokenMeta'),
  runtimeTotal: document.getElementById('runtimeTotal'),
  runtimeMeta: document.getElementById('runtimeMeta'),
  pollStatus: document.getElementById('pollStatus'),
  pollMeta: document.getElementById('pollMeta'),
  rateLimitStatus: document.getElementById('rateLimitStatus'),
  rateLimitMeta: document.getElementById('rateLimitMeta'),
  repoGateStatus: document.getElementById('repoGateStatus'),
  repoGateMeta: document.getElementById('repoGateMeta'),
  runningList: document.getElementById('runningList'),
  retryList: document.getElementById('retryList'),
  statusFilter: document.getElementById('statusFilter'),
  searchInput: document.getElementById('searchInput'),
  issueList: document.getElementById('issueList'),
  issueDetail: document.getElementById('issueDetail'),
  dataSource: document.getElementById('dataSource'),
  syncStatus: document.getElementById('syncStatus'),
  refreshStatus: document.getElementById('refreshStatus')
};

const state = {
  data: null,
  loading: false,
  selectedRowKey: null,
  filters: {
    status: 'all',
    search: ''
  },
  auth: {
    enabled: runnerHosted,
    baseUrl: runnerHosted ? window.location.origin : null,
    token: '',
    status: runnerHosted ? 'connecting' : 'disabled'
  },
  refreshRequest: {
    pending: false,
    status: 'Not requested',
    error: null
  }
};

const HERO_NOTE =
  'Compatibility-projection truth for running sessions, retry queues, and operator polling health.';

let refreshTimer = null;
let activeLoadPromise = null;
let queuedLoadAfterCurrent = false;

elements.dataSource.textContent = dataUrl
  ? `Data source: ${dataUrl}`
  : 'Data source: add ?data=<url> when opening the static bundle outside /ui';
elements.refreshButton.addEventListener('click', () => {
  requestRefresh();
});
elements.statusFilter.addEventListener('change', (event) => {
  state.filters.status = event.target.value;
  syncVisibleSelectedIssue();
  render();
});
elements.searchInput.addEventListener('input', (event) => {
  state.filters.search = event.target.value;
  syncVisibleSelectedIssue();
  render();
});
elements.issueList.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }
  const button = event.target.closest('[data-issue-id]');
  if (!(button instanceof HTMLElement)) {
    return;
  }
  const rowKey = button.dataset.issueId ?? null;
  if (!rowKey || rowKey === state.selectedRowKey) {
    return;
  }
  state.selectedRowKey = rowKey;
  render();
});

boot();

async function boot() {
  if (state.auth.enabled) {
    await initSession();
  }
  await loadData();
  if (!dataUrl) {
    return;
  }
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer);
  }
  refreshTimer = window.setInterval(() => {
    void loadData();
  }, refreshMs);
}

async function initSession() {
  const url = buildControlUrl('/auth/session');
  if (!url) {
    state.auth.status = 'disabled';
    render();
    return;
  }

  state.auth.status = 'connecting';
  render();
  try {
    const response = await fetch(url, { method: 'POST', cache: 'no-store' });
    if (response.status === 401 || response.status === 403) {
      state.auth.status = 'unauthorized';
      render();
      return;
    }
    if (!response.ok) {
      throw new Error(`Session bootstrap failed (${response.status})`);
    }
    const payload = await response.json();
    state.auth.token = typeof payload.token === 'string' ? payload.token : '';
    state.auth.status = state.auth.token ? 'ready' : 'unauthorized';
  } catch (error) {
    console.warn('[auth] Session initialization failed:', error);
    state.auth.status = 'error';
  }
  render();
}

async function loadData(retriedAfterUnauthorized = false, options = {}) {
  if (!dataUrl) {
    setSyncStatus('Provide ?data=<url> or serve this bundle behind /ui/data.json', false, true);
    render();
    return;
  }

  if (activeLoadPromise) {
    if (options.queueIfBusy) {
      queuedLoadAfterCurrent = true;
    }
    return activeLoadPromise;
  }

  const loadPromise = (async () => {
    let nextRetriedAfterUnauthorized = retriedAfterUnauthorized;
    do {
      queuedLoadAfterCurrent = false;

      if (state.auth.enabled && !state.auth.token) {
        if (!nextRetriedAfterUnauthorized) {
          await initSession();
          if (state.auth.token) {
            nextRetriedAfterUnauthorized = true;
            continue;
          }
        }
        setSyncStatus(buildMissingSessionStatusMessage(), false, true);
        render();
        return;
      }

      state.loading = true;
      setSyncStatus(null, true);
      try {
        const dataHeaders = buildDataHeaders();
        const response = await fetch(dataUrl, {
          cache: 'no-store',
          ...(dataHeaders ? { headers: dataHeaders } : {})
        });
        if (response.status === 401 || response.status === 403) {
          const recovered = !nextRetriedAfterUnauthorized && (await renewSession());
          if (recovered) {
            nextRetriedAfterUnauthorized = true;
            continue;
          }
          setSyncStatus(buildMissingSessionStatusMessage(), false, true);
          return;
        }
        if (!response.ok) {
          throw new Error(`Failed to load data (${response.status})`);
        }
        state.data = await response.json();
        syncSelectedIssue();
        setSyncStatus(formatTimestamp(state.data.generated_at), false);
        nextRetriedAfterUnauthorized = false;
      } catch (error) {
        setSyncStatus(error instanceof Error ? error.message : 'Failed to load data', false, true);
        nextRetriedAfterUnauthorized = false;
      } finally {
        state.loading = false;
        render();
      }
    } while (queuedLoadAfterCurrent);
  })();

  const wrappedLoadPromise = loadPromise.finally(() => {
    if (activeLoadPromise === wrappedLoadPromise) {
      activeLoadPromise = null;
    }
  });
  activeLoadPromise = wrappedLoadPromise;
  return wrappedLoadPromise;
}

async function requestRefresh(retriedAfterUnauthorized = false) {
  if (!state.auth.token) {
    state.refreshRequest.status = buildMissingSessionStatusMessage();
    render();
    return;
  }
  const url = buildControlUrl('/api/v1/refresh');
  if (!url) {
    state.refreshRequest.status = 'Refresh unavailable';
    render();
    return;
  }

  state.refreshRequest.pending = true;
  state.refreshRequest.error = null;
  state.refreshRequest.status = 'Requesting…';
  render();

  let handledInlineRender = false;
  try {
    const response = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(true)
      },
      body: JSON.stringify({ action: 'refresh' })
    });
    if (response.status === 401 || response.status === 403) {
      const recovered = !retriedAfterUnauthorized && (await renewSession());
      if (recovered) {
        state.refreshRequest.pending = false;
        handledInlineRender = true;
        render();
        return requestRefresh(true);
      }
      state.refreshRequest.status = buildMissingSessionStatusMessage();
      state.refreshRequest.pending = false;
      handledInlineRender = true;
      render();
      return;
    }
    const payload = await response.json();
    if (!response.ok) {
      const reason = payload?.error?.message || `Refresh failed (${response.status})`;
      throw new Error(reason);
    }
    state.refreshRequest.status = formatRefreshAck(payload);
    await loadData(false, { queueIfBusy: true });
  } catch (error) {
    state.refreshRequest.error = error instanceof Error ? error.message : 'Refresh failed';
    state.refreshRequest.status = state.refreshRequest.error;
  } finally {
    state.refreshRequest.pending = false;
    if (!handledInlineRender) {
      render();
    }
  }
}

function render() {
  const issuePaneFocus = captureIssuePaneFocus();
  renderHeader();
  renderSummary();
  renderQueues();
  renderIssueList();
  renderIssueDetail();
  restoreIssuePaneFocus(issuePaneFocus);
  elements.refreshStatus.textContent = state.refreshRequest.status;
}

function renderHeader() {
  const authLabel = formatAuthStatus(state.auth.status);
  elements.authBadge.textContent = authLabel;
  elements.authBadge.dataset.state = state.auth.status;
  elements.refreshButton.disabled = !state.auth.token || state.refreshRequest.pending;
  elements.heroNote.textContent = buildHeroNote();
}

function renderSummary() {
  const counts = state.data?.counts || { running: 0, retrying: 0, issues: 0 };
  const totals = state.data?.totals || {
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    seconds_running: 0
  };
  const polling = state.data?.polling || null;
  const rateLimits = state.data?.rate_limits || null;
  const docsFreshnessGate = state.data?.repo_gates?.docs_freshness_maintain || null;

  elements.runningCount.textContent = String(counts.running || 0);
  elements.runningMeta.textContent =
    counts.issues > 0 ? `${counts.issues} tracked issues in the dashboard` : 'No active tracked issues';
  elements.retryCount.textContent = String(counts.retrying || 0);
  elements.retryMeta.textContent =
    counts.retrying > 0 ? 'Retry queue is currently populated' : 'No queued retries';
  elements.tokenTotal.textContent = formatNumber(totals.total_tokens || 0);
  const tokenMetaParts = [
    `${formatNumber(totals.input_tokens || 0)} input`,
    `${formatNumber(totals.output_tokens || 0)} output`,
    `${formatNullableNumber(totals.reasoning_output_tokens)} reasoning`
  ];
  elements.tokenMeta.textContent = tokenMetaParts.join(' / ');
  elements.runtimeTotal.textContent = formatDuration(totals.seconds_running || 0);
  elements.runtimeMeta.textContent =
    totals.seconds_running > 0 ? 'Combined runtime across current issues' : 'No active runtime yet';
  elements.pollStatus.textContent = formatPollStatus(polling);
  elements.pollMeta.textContent = formatPollMeta(polling);
  elements.rateLimitStatus.textContent = rateLimits ? 'Latest sample' : 'None';
  elements.rateLimitMeta.textContent = rateLimits ? summarizeRateLimits(rateLimits) : 'No latest rate-limit sample';
  elements.repoGateStatus.textContent = docsFreshnessGate
    ? formatRepoGateSeverity(docsFreshnessGate.severity)
    : 'Unknown';
  elements.repoGateMeta.textContent = docsFreshnessGate
    ? summarizeDocsFreshnessGate(docsFreshnessGate)
    : 'No repo-gate sample';
}

function renderQueues() {
  const running = Array.isArray(state.data?.running) ? state.data.running : [];
  const retrying = Array.isArray(state.data?.retrying) ? state.data.retrying : [];

  elements.runningList.innerHTML = running.length
    ? running.map((entry) => renderRunningCard(entry)).join('')
    : '<div class="empty-state">No running sessions.</div>';
  elements.retryList.innerHTML = retrying.length
    ? retrying.map((entry) => renderRetryCard(entry)).join('')
    : '<div class="empty-state">No queued retries.</div>';
}

function renderIssueList() {
  const issues = getFilteredIssues();
  elements.issueList.innerHTML = issues.length
    ? issues.map((issue) => renderIssueCard(issue)).join('')
    : '<div class="empty-state">No issues match the current filter.</div>';
}

function renderIssueDetail() {
  const issue = getSelectedIssue();
  if (!issue) {
    elements.issueDetail.innerHTML =
      '<div class="empty-state">No selected issue. Wait for data or pick one from the issue list.</div>';
    return;
  }

  const detailId = buildIssueDetailId(getIssueRowKey(issue));
  elements.issueDetail.innerHTML = `
    <div id="${escapeHtml(detailId)}">
      <section class="detail-section">
        <div class="detail-header">
          <div>
            <div class="detail-eyebrow">${escapeHtml(issue.issue_identifier)}</div>
            <h2>${escapeHtml(issue.title || 'Untitled issue')}</h2>
          </div>
          <div class="detail-status">
            <span class="status-chip">${escapeHtml(issue.display_status || issue.status || 'unknown')}</span>
            ${issue.is_selected ? '<span class="status-note">Selected run authority</span>' : ''}
          </div>
        </div>
        ${buildIssueLink(issue.url, getIssueRowKey(issue))}
        <p class="detail-summary">${escapeHtml(issue.summary || 'No summary available.')}</p>
      </section>

      <section class="detail-section">
        <div class="section-title">Lifecycle</div>
        ${renderKeyValueGrid([
          ['Status', issue.status || 'unknown'],
          ['Display', issue.display_status || 'unknown'],
          ['Reason', issue.status_reason || '—'],
          ['Task', issue.task_id || '—'],
          ['Run', issue.run_id || '—']
        ])}
      </section>

      <section class="detail-section">
        <div class="section-title">Session</div>
        ${renderKeyValueGrid([
          ['Session', issue.session.session_id || '—'],
          ['Thread', issue.session.thread_id || '—'],
          ['Turns', formatNullableNumber(issue.session.turn_count)],
          ['Owner phase', issue.owner.phase || '—'],
          ['Owner status', issue.owner.status || '—']
        ])}
      </section>

      <section class="detail-section">
        <div class="section-title">Workspace</div>
        ${renderKeyValueGrid([
          ['Path', issue.workspace.path || '—'],
          ['Host', issue.workspace.host || '—'],
          ['Last error', issue.last_error || '—']
        ])}
      </section>

      <section class="detail-section">
        <div class="section-title">Retry State</div>
        ${
          issue.retry
            ? renderKeyValueGrid([
                ['Attempt', formatNullableNumber(issue.retry.attempt)],
                ['Due', formatTimestamp(issue.retry.due_at)],
                ['Error', issue.retry.error || '—'],
                ['Last event', issue.retry.last_event || '—']
              ])
            : '<div class="empty-inline">No retry queued.</div>'
        }
      </section>

      <section class="detail-section">
        <div class="section-title">Token Usage</div>
        ${
          issue.tokens
            ? renderKeyValueGrid([
                ['Input', formatNullableNumber(issue.tokens.input_tokens)],
                ['Output', formatNullableNumber(issue.tokens.output_tokens)],
                ['Total', formatNullableNumber(issue.tokens.total_tokens)],
                ['Reasoning', formatNullableNumber(issue.tokens.reasoning_output_tokens)]
              ])
            : '<div class="empty-inline">No token usage available.</div>'
        }
      </section>

      <section class="detail-section">
        <div class="section-title">Recent Agent Activity</div>
        ${renderActivityList(issue.recent_agent_activity, 'No recent agent activity.')}
      </section>

      <section class="detail-section">
        <div class="section-title">Recent Linear Activity</div>
        ${renderLinearActivity(issue.linear_activity)}
      </section>
    </div>
  `;
}

function renderRunningCard(entry) {
  return `
    <div class="queue-card">
      <div class="queue-card-top">
        <div class="queue-id">${escapeHtml(entry.issue_identifier || 'unknown')}</div>
        <div class="queue-state">${escapeHtml(entry.display_state || 'unknown')}</div>
      </div>
      <div class="queue-meta">
        <span>${escapeHtml(entry.session_id || 'no session')}</span>
        <span>${escapeHtml(formatNullableNumber(entry.turn_count))} turns</span>
        <span>${escapeHtml(formatTimestamp(entry.last_event_at))}</span>
      </div>
      <div class="queue-summary">${escapeHtml(entry.last_message || entry.last_event || 'No recent message.')}</div>
    </div>
  `;
}

function renderRetryCard(entry) {
  return `
    <div class="queue-card retry-card">
      <div class="queue-card-top">
        <div class="queue-id">${escapeHtml(entry.issue_identifier || 'unknown')}</div>
        <div class="queue-state">${escapeHtml(entry.display_state || 'retrying')}</div>
      </div>
      <div class="queue-meta">
        <span>Attempt ${escapeHtml(formatNullableNumber(entry.attempt))}</span>
        <span>${escapeHtml(formatTimestamp(entry.due_at))}</span>
      </div>
      <div class="queue-summary">${escapeHtml(entry.error || entry.last_message || 'Retry queued.')}</div>
    </div>
  `;
}

function renderIssueCard(issue) {
  const classes = ['issue-card'];
  if (issue.is_selected) {
    classes.push('selected');
  }
  const rowKey = getIssueRowKey(issue);
  const isActive = rowKey !== null && state.selectedRowKey === rowKey;
  if (isActive) {
    classes.push('active');
  }
  const detailId = buildIssueDetailId(rowKey);
  return `
    <button
      class="${classes.join(' ')}"
      type="button"
      data-issue-id="${escapeHtml(rowKey || '')}"
      aria-pressed="${isActive ? 'true' : 'false'}"
      ${isActive ? 'aria-current="true"' : ''}
      aria-controls="${escapeHtml(detailId)}"
    >
      <div class="issue-card-top">
        <div>
          <div class="issue-card-id">${escapeHtml(issue.issue_identifier)}</div>
          <div class="issue-card-title">${escapeHtml(issue.title || 'Untitled issue')}</div>
        </div>
        <div class="issue-card-status">${escapeHtml(issue.display_status || issue.status || 'unknown')}</div>
      </div>
      <div class="issue-card-meta">
        <span>${escapeHtml(issue.workspace.path || 'no workspace')}</span>
        <span>${escapeHtml(issue.session.session_id || 'no session')}</span>
      </div>
      <div class="issue-card-summary">${escapeHtml(issue.last_error || issue.summary || 'No summary available.')}</div>
      ${issue.is_selected ? '<span class="issue-card-note">Selected run authority</span>' : ''}
    </button>
  `;
}

function renderKeyValueGrid(entries) {
  return `<div class="key-grid">${entries
    .map(
      ([key, value]) => `
        <div class="key-cell">
          <div class="key-label">${escapeHtml(key)}</div>
          <div class="key-value">${escapeHtml(formatGridValue(value))}</div>
        </div>
      `
    )
    .join('')}</div>`;
}

async function renewSession() {
  if (!state.auth.enabled) {
    return false;
  }
  state.auth.token = '';
  await initSession();
  return Boolean(state.auth.token);
}

function renderActivityList(events, emptyLabel) {
  if (!Array.isArray(events) || events.length === 0) {
    return `<div class="empty-inline">${escapeHtml(emptyLabel)}</div>`;
  }
  return `<div class="activity-list">${events
    .map(
      (event) => `
        <div class="activity-row">
          <div class="activity-head">
            <span>${escapeHtml(event.event || 'event')}</span>
            <span>${escapeHtml(formatTimestamp(event.at))}</span>
          </div>
          <div class="activity-body">${escapeHtml(event.message || 'No message available.')}</div>
        </div>
      `
    )
    .join('')}</div>`;
}

function renderLinearActivity(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return '<div class="empty-inline">No recent Linear activity.</div>';
  }
  return `<div class="activity-list">${events
    .map(
      (event) => `
        <div class="activity-row">
          <div class="activity-head">
            <span>${escapeHtml(event.actor_name || 'unknown actor')}</span>
            <span>${escapeHtml(formatTimestamp(event.created_at))}</span>
          </div>
          <div class="activity-body">${escapeHtml(event.summary || 'No summary available.')}</div>
        </div>
      `
    )
    .join('')}</div>`;
}

function getFilteredIssues() {
  const issues = getAllIssues();
  const search = state.filters.search.trim().toLowerCase();

  return issues.filter((issue) => {
    if (state.filters.status === 'running' && issue.status !== 'running') {
      return false;
    }
    if (state.filters.status === 'retrying' && issue.status !== 'retrying') {
      return false;
    }
    if (state.filters.status === 'errored' && !issue.last_error) {
      return false;
    }
    if (state.filters.status === 'selected' && !issue.is_selected) {
      return false;
    }
    if (!search) {
      return true;
    }
    const haystack = [
      issue.issue_identifier,
      issue.title,
      issue.status,
      issue.display_status,
      issue.summary,
      issue.last_error
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(search);
  });
}

function getSelectedIssue() {
  const issues = getFilteredIssues();
  if (issues.length === 0) {
    return null;
  }
  return issues.find((issue) => getIssueRowKey(issue) === state.selectedRowKey) || issues[0];
}

function syncSelectedIssue() {
  const issues = getAllIssues();
  rebaseSelectedIssue(issues, getPreferredSelectedRowKey(issues));
  syncVisibleSelectedIssue();
}

function buildHeroNote() {
  return HERO_NOTE;
}

function buildIssueLink(value, rowKey = null) {
  const safeHref = sanitizeHttpUrl(value);
  if (!safeHref) {
    return '';
  }
  return `<a class="detail-link" href="${safeHref}" target="_blank" rel="noreferrer" data-detail-link-for="${escapeHtml(
    rowKey || ''
  )}">Open issue in Linear</a>`;
}

function sanitizeHttpUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return escapeHtml(url.toString());
  } catch {
    return null;
  }
}

function buildIssueDetailId(rowKey) {
  return `issue-detail-${String(rowKey || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')}`;
}

function getAllIssues() {
  return Array.isArray(state.data?.issues) ? state.data.issues : [];
}

function getIssueRowKey(issue) {
  if (!issue || typeof issue !== 'object') {
    return null;
  }
  return issue.run_id || issue.task_id || issue.issue_identifier || null;
}

function getPreferredSelectedRowKey(issues) {
  const selectedRowKey = getIssueRowKey(state.data?.selected);
  if (selectedRowKey) {
    return selectedRowKey;
  }

  const selectedIssue = issues.find((issue) => issue?.is_selected);
  if (selectedIssue) {
    return getIssueRowKey(selectedIssue);
  }

  const selectedIssueIdentifier = state.data?.selected_issue_identifier;
  if (typeof selectedIssueIdentifier !== 'string' || selectedIssueIdentifier.length === 0) {
    return null;
  }
  return getIssueRowKey(
    issues.find((issue) => issue?.issue_identifier === selectedIssueIdentifier) ?? null
  );
}

function rebaseSelectedIssue(issues, preferredRowKey = null) {
  if (!Array.isArray(issues) || issues.length === 0) {
    state.selectedRowKey = null;
    return;
  }
  if (issues.some((issue) => getIssueRowKey(issue) === state.selectedRowKey)) {
    return;
  }
  const preferredSelection = preferredRowKey
    ? issues.find((issue) => getIssueRowKey(issue) === preferredRowKey) ?? null
    : null;
  const selectedIssue = issues.find((issue) => issue.is_selected) ?? null;
  state.selectedRowKey = getIssueRowKey(preferredSelection || selectedIssue || issues[0]);
}

function syncVisibleSelectedIssue() {
  rebaseSelectedIssue(getFilteredIssues());
}

function captureIssuePaneFocus() {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) {
    return null;
  }

  const issueButton = activeElement.closest('[data-issue-id]');
  if (issueButton instanceof HTMLElement && elements.issueList.contains(issueButton)) {
    const rowKey = issueButton.dataset.issueId ?? null;
    if (rowKey) {
      return { type: 'issue-button', rowKey };
    }
  }

  const detailLink = activeElement.closest('[data-detail-link-for]');
  if (detailLink instanceof HTMLElement && elements.issueDetail.contains(detailLink)) {
    const rowKey = detailLink.dataset.detailLinkFor ?? null;
    if (rowKey) {
      return { type: 'detail-link', rowKey };
    }
  }

  return null;
}

function restoreIssuePaneFocus(snapshot) {
  if (!snapshot || !snapshot.rowKey) {
    return;
  }

  const root = snapshot.type === 'detail-link' ? elements.issueDetail : elements.issueList;
  const attributeName = snapshot.type === 'detail-link' ? 'data-detail-link-for' : 'data-issue-id';
  const nextFocusTarget = findElementByDataAttribute(root, attributeName, snapshot.rowKey);
  if (nextFocusTarget instanceof HTMLElement) {
    nextFocusTarget.focus();
  }
}

function findElementByDataAttribute(root, attributeName, attributeValue) {
  if (!(root instanceof HTMLElement)) {
    return null;
  }
  const candidates = root.querySelectorAll(`[${attributeName}]`);
  for (const candidate of candidates) {
    if (candidate instanceof HTMLElement && candidate.getAttribute(attributeName) === attributeValue) {
      return candidate;
    }
  }
  return null;
}

function buildControlUrl(pathname) {
  if (!state.auth.baseUrl) {
    return null;
  }
  try {
    return new URL(pathname, state.auth.baseUrl).toString();
  } catch {
    return null;
  }
}

function buildAuthHeaders(includeCsrf) {
  if (!state.auth.token) {
    return {};
  }
  const headers = {
    Authorization: `Bearer ${state.auth.token}`
  };
  if (includeCsrf) {
    headers['x-csrf-token'] = state.auth.token;
  }
  return headers;
}

function buildDataHeaders() {
  if (!state.auth.token || !dataUrl) {
    return null;
  }
  try {
    const url = new URL(dataUrl, window.location.origin);
    if (url.origin === window.location.origin) {
      return buildAuthHeaders(false);
    }
  } catch {
    return null;
  }
  return null;
}

function resolveDataUrl() {
  const explicit = params.get('data');
  if (explicit) {
    return explicit;
  }
  return runnerHosted ? '/ui/data.json' : null;
}

function formatAuthStatus(status) {
  switch (status) {
    case 'ready':
      return 'Session Ready';
    case 'connecting':
      return 'Session Bootstrapping';
    case 'unauthorized':
      return 'Session Required';
    case 'error':
      return 'Session Error';
    case 'disabled':
    default:
      return 'Static Mode';
  }
}

function buildMissingSessionStatusMessage() {
  return state.auth.status === 'unauthorized' ? 'Session required' : 'Session bootstrap failed';
}

function formatRefreshAck(payload) {
  const operationText = Array.isArray(payload?.operations) && payload.operations.length > 0
    ? payload.operations.join(' + ')
    : 'reconcile';
  const requestedAt = formatTimestamp(payload?.requested_at);
  return `${operationText} at ${requestedAt}`;
}

function formatPollStatus(polling) {
  if (!polling || !polling.enabled) {
    return 'Unavailable';
  }
  if (polling.checking) {
    return 'Checking';
  }
  if (polling.last_error) {
    return 'Degraded';
  }
  return 'Healthy';
}

function formatPollMeta(polling) {
  if (!polling || !polling.enabled) {
    return 'No provider polling coordinator registered';
  }
  const parts = [];
  if (polling.last_mode) {
    parts.push(`last ${polling.last_mode}`);
  }
  if (polling.last_success_at) {
    parts.push(`ok ${formatTimestamp(polling.last_success_at)}`);
  }
  if (polling.next_poll_in_ms !== null && polling.next_poll_in_ms !== undefined) {
    parts.push(`next ${formatDuration(polling.next_poll_in_ms / 1000)}`);
  }
  if (polling.last_error) {
    parts.push(`error ${polling.last_error}`);
  }
  return parts.length > 0 ? parts.join(' • ') : 'Polling health not yet observed';
}

function summarizeRateLimits(rateLimits) {
  if (!rateLimits || typeof rateLimits !== 'object') {
    return 'No latest rate-limit sample';
  }
  return Object.entries(rateLimits)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' • ');
}

function formatRepoGateSeverity(severity) {
  if (!severity) {
    return 'Unknown';
  }
  return String(severity)
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDocsFreshnessCapacity(capacity) {
  if (!capacity?.status) {
    return null;
  }
  const parts = [`capacity ${capacity.status}`];
  if (Number.isFinite(Number(capacity.current_entries)) || Number.isFinite(Number(capacity.max_entries))) {
    const entryExcess = Number(capacity.entry_excess ?? 0);
    parts.push(
      `entries ${formatNullableNumber(capacity.current_entries)}/${formatNullableNumber(capacity.max_entries)}${
        entryExcess > 0 ? ` (+${entryExcess})` : ''
      }`
    );
  }
  if (Number.isFinite(Number(capacity.current_cohorts)) || Number.isFinite(Number(capacity.max_cohorts))) {
    const cohortExcess = Number(capacity.cohort_excess ?? 0);
    parts.push(
      `cohorts ${formatNullableNumber(capacity.current_cohorts)}/${formatNullableNumber(capacity.max_cohorts)}${
        cohortExcess > 0 ? ` (+${cohortExcess})` : ''
      }`
    );
  }
  if (Number.isFinite(Number(capacity.expired_entries))) {
    parts.push(`expired ${formatNullableNumber(capacity.expired_entries)}`);
  }
  return parts.join(' ');
}

function summarizeDocsFreshnessGate(gate) {
  const parts = [];
  if (gate.evidence_status && gate.evidence_status !== 'fresh') {
    parts.push(gate.evidence_reason ? `${gate.evidence_status}: ${gate.evidence_reason}` : gate.evidence_status);
  }
  if (gate.freshness_decision) {
    parts.push(gate.freshness_decision);
  }
  parts.push(`${formatNullableNumber(gate.action_required_count)} actions`);
  if (gate.owner?.issue) {
    parts.push(`owner ${gate.owner.issue}`);
  }
  if (gate.owner?.canonical_owner_key || gate.canonical_owner_key) {
    parts.push(`canonical ${gate.owner?.canonical_owner_key ?? gate.canonical_owner_key}`);
  }
  if (gate.spec_guard?.status) {
    parts.push(`spec ${gate.spec_guard.status}`);
  }
  const capacitySummary = formatDocsFreshnessCapacity(gate.capacity);
  if (capacitySummary) {
    parts.push(capacitySummary);
  }
  if (gate.next_expiry) {
    parts.push(`next ${gate.next_expiry}`);
  }
  if (gate.generated_at) {
    parts.push(`generated ${formatTimestamp(gate.generated_at)}`);
  }
  if (gate.source_path) {
    parts.push(`source ${formatRepoGateSource(gate.source_path)}`);
  }
  if (gate.provider_wip_impact === 'excluded_repo_gate') {
    parts.push('not WIP');
  }
  return parts.join(' • ');
}

function formatRepoGateSource(sourcePath) {
  const normalized = String(sourcePath || '').replace(/\\/g, '/');
  if (!normalized) {
    return 'unknown';
  }
  const marker = '/out/';
  const markerIndex = normalized.lastIndexOf(marker);
  return markerIndex >= 0 ? normalized.slice(markerIndex + 1) : normalized;
}

function setSyncStatus(message, syncing, error = false) {
  if (syncing) {
    elements.syncStatus.textContent = 'Syncing…';
    elements.syncStatus.dataset.state = 'syncing';
    return;
  }
  elements.syncStatus.textContent = message || '—';
  elements.syncStatus.dataset.state = error ? 'error' : 'ok';
}

function formatTimestamp(value) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '0s';
  }
  const seconds = Math.round(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainder}s`;
  }
  return `${remainder}s`;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US').format(value);
}

function formatNullableNumber(value) {
  return Number.isFinite(value) ? formatNumber(value) : '—';
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

function formatGridValue(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return value;
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
