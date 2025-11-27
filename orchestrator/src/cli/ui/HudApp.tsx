import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text } from 'ink';

import type { HudLogEntry, HudStage, HudState } from './store.js';
import { createInitialHudState, HudStore } from './store.js';

interface HudAppProps {
  store: HudStore;
  footerNote?: string;
}

export function HudApp({ store, footerNote }: HudAppProps): JSX.Element {
  const [state, setState] = useState<HudState>(store.getState());
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const unsubscribe = store.subscribe(setState);
    return () => unsubscribe();
  }, [store]);

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = useMemo(
    () => formatElapsed(state.startedAt, state.completedAt, tick),
    [state.startedAt, state.completedAt, tick]
  );

  if (state.status === 'idle' && !state.runId) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">codex-orchestrator HUD</Text>
        <Text color="gray">Awaiting run events...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header state={state} elapsed={elapsed} />
      <Text> </Text>
      <StageList stages={state.stages} />
      <Text> </Text>
      <LogPanel logs={state.logs} />
      <Text> </Text>
      <Footer
        manifestPath={state.manifestPath}
        metricsPath={state.metricsPath}
        runSummaryPath={state.runSummaryPath}
        note={footerNote}
      />
    </Box>
  );
}

interface HeaderProps {
  state: HudState;
  elapsed: string;
}

function Header({ state, elapsed }: HeaderProps): JSX.Element {
  const statusColor = colorForStatus(state.status);
  return (
    <Box flexDirection="column">
      <Text>
        HUD | TASK {state.taskId ?? '-'} | RUN {state.runId ?? '-'} | STATUS{' '}
        <Text color={statusColor}>[{state.status.toUpperCase()}]</Text> | ELAPSED {elapsed}
      </Text>
      <Text color="gray">
        {state.pipelineTitle ?? 'pipeline'} | manifest: {state.manifestPath ?? 'pending'} | log: {state.logPath ?? 'pending'}
      </Text>
    </Box>
  );
}

interface StageListProps {
  stages: HudStage[];
}

function StageList({ stages }: StageListProps): JSX.Element {
  if (!stages || stages.length === 0) {
    return (
      <Box>
        <Text color="gray">No stage metadata available yet.</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column">
      <Text color="cyan">Stages</Text>
      {stages.map((stage) => (
        <StageRow key={stage.id} stage={stage} />
      ))}
    </Box>
  );
}

function StageRow({ stage }: { stage: HudStage }): JSX.Element {
  const statusColor = colorForStatus(stage.status);
  const label = stage.title || stage.id;
  const summary = stage.summary ?? stage.logPath ?? '';
  return (
    <Text>
      [{String(stage.index).padStart(2, '0')}] <Text color={statusColor}>{stage.status.toUpperCase()}</Text> {label}
      {summary ? ` - ${summary}` : ''}
    </Text>
  );
}

interface LogPanelProps {
  logs: HudLogEntry[];
}

function LogPanel({ logs }: LogPanelProps): JSX.Element {
  const tail = logs.slice(-8);
  return (
    <Box flexDirection="column">
      <Text color="cyan">Log Tail (latest {tail.length})</Text>
      {tail.length === 0 ? (
        <Text color="gray">No logs yet.</Text>
      ) : (
        tail.map((log) => (
          <Text key={log.id} color={colorForLevel(log.level)}>
            {formatClock(log.timestamp)} {log.stageId ? `[${log.stageId}] ` : ''}{log.message.trim()}
          </Text>
        ))
      )}
    </Box>
  );
}

interface FooterProps {
  manifestPath: string | null;
  metricsPath: string | null;
  runSummaryPath: string | null;
  note?: string;
}

function Footer({ manifestPath, metricsPath, runSummaryPath, note }: FooterProps): JSX.Element {
  return (
    <Box flexDirection="column">
      <Text color="gray">
        read-only HUD | manifest: {manifestPath ?? 'pending'} | metrics: {metricsPath ?? 'pending'} | summary:{' '}
        {runSummaryPath ?? 'pending'}
      </Text>
      {note ? <Text color="gray">{note}</Text> : null}
    </Box>
  );
}

function colorForStatus(status: HudState['status'] | HudStage['status']): string | undefined {
  switch (status) {
    case 'running':
    case 'in_progress':
      return 'cyan';
    case 'succeeded':
      return 'green';
    case 'skipped':
      return 'yellow';
    case 'failed':
    case 'cancelled':
      return 'red';
    case 'pending':
      return 'gray';
    default:
      return undefined;
  }
}

function colorForLevel(level: HudLogEntry['level']): string | undefined {
  switch (level) {
    case 'warn':
      return 'yellow';
    case 'error':
      return 'red';
    case 'debug':
      return 'gray';
    default:
      return undefined;
  }
}

function formatElapsed(start: string | null, end: string | null, nowMs: number): string {
  if (!start) {
    return '--:--';
  }
  const startMs = Date.parse(start);
  const endMs = end ? Date.parse(end) : nowMs;
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return '--:--';
  }
  const totalSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const minsRemaining = minutes % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minsRemaining).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minsRemaining).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatClock(timestamp: string): string {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return '--:--:--';
  }
  const date = new Date(parsed);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Exported for tests
export const __private = {
  formatElapsed,
  formatClock,
  colorForStatus,
  colorForLevel,
  createInitialHudState
};
