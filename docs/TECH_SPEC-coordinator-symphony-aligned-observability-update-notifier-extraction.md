# TECH_SPEC - Coordinator Symphony-Aligned Observability Update Notifier Extraction (1022)

## Overview
- Introduce a small in-process observability update notifier so control-plane publishers emit generic update signals instead of calling a Telegram-specific callback directly.
- Keep Telegram as the first subscriber to that notifier, reusing the existing bridge read model and push dedupe/cooldown behavior.
- Preserve the current external HTTP routes and `/control/action` transport path; this slice only changes internal update-signaling ownership.
- Keep the notifier coarse-grained: it signals that observability state changed and never attempts to carry rendered state to subscribers.

## Objectives
- Remove `notifyTelegramProjectionDelta(...)` as a publisher-facing contract from `RequestContext`.
- Add a notifier boundary that can accept update metadata (`eventSeq`, `source`) and fan out to zero or more subscribers safely.
- Wire `ControlServer` and `TelegramOversightBridge` through that notifier instead of direct bridge callback knowledge.

## Current State
- `controlServer.ts` owns:
  - `notifyTelegramProjectionDelta(...)`,
  - bridge lifecycle,
  - direct calls from `broadcast(...)`,
  - publisher wiring through `RequestContext.notifyTelegramProjectionDelta`.
- Question flows, question expiry, and accepted Linear webhook updates call that Telegram-specific notifier directly.
- `telegramOversightBridge.ts` already owns:
  - projection hash dedupe,
  - cooldown/pending logic,
  - fresh read-side rendering through the injected read adapter.

## Proposed Changes

### 1. Internal observability update notifier
- Add a focused internal notifier module in the control layer, for example `observabilityUpdateNotifier.ts`.
- The notifier contract should stay minimal:
  - `publish(input?: { eventSeq?: number | null; source?: string | null }): void`
  - `subscribe(listener): () => void` cleanup handle
- The notifier is an invalidation signal, not a data bus:
  - it does not carry rendered state payloads,
  - subscribers are responsible for re-reading the shared projection/observability surface.
- Publisher failure policy:
  - subscribers run fire-and-forget,
  - subscriber errors are swallowed or logged at the notifier boundary,
  - zero-subscriber operation is a no-op.

### 2. ControlServer wiring
- `ControlServer` should create one notifier instance at startup.
- `RequestContext` should expose a generic observability-update publisher callback instead of a Telegram-specific one.
- `broadcast(...)` should publish through the notifier.
- When the Telegram bridge starts, `ControlServer` should subscribe the bridge to the notifier and release that subscription on shutdown.

### 3. Publisher migration
- Migrate existing update publishers to the generic notifier contract without changing their trigger semantics:
  - `question_queued`,
  - `question_answered`,
  - `question_dismissed`,
  - question expiry,
  - accepted live Linear webhook updates,
  - event-stream broadcast path.
- Keep intentionally silent paths silent.

### 4. Telegram bridge behavior
- Keep `TelegramOversightBridge.notifyProjectionDelta(...)` as the bridge-local subscriber entrypoint for now.
- The bridge continues re-reading the projection via the 1021 read adapter and applying its own hash/cooldown rules.
- No Telegram command formatting or write-path changes in this slice.

## Functional Requirements
- Publishers no longer reference Telegram by name in the update-signaling contract they consume.
- Telegram projection pushes continue to occur from the same meaningful state-change sources as the `1021` closeout tree.
- Starting the control server without Telegram enabled remains safe and produces a functional no-subscriber notifier path.
- Closing the control server releases any notifier subscription owned by the Telegram bridge.

## Non-Functional Requirements
- Keep the extraction bounded to internal wiring; avoid new framework or dependency layers.
- Maintain fail-soft subscriber behavior so one push failure does not affect the request or event publisher path.
- Keep the solution easy to extend to a future non-Telegram subscriber without widening scope now.

## Interfaces & Data Contracts
- New internal contract:
  - `ObservabilityUpdateNotifier`
  - subscriber callback receives `{ eventSeq?: number | null; source?: string | null }`
- Updated request context contract:
  - rename or replace Telegram-specific callback with a generic observability update publisher.
- No external HTTP or persisted state schema changes.

## Validation Plan
- Docs-review before implementation.
- Targeted tests covering:
  - notifier publish/subscribe lifecycle,
  - `ControlServer` startup wiring to the Telegram bridge,
  - continued update triggers from question and event-stream publishers,
  - safe no-subscriber behavior.
- Manual/mock observability update evidence showing Telegram push behavior still reacts coherently to notifier publications.
- Full validation gate chain and explicit elegance review before closeout.

## Risks
- If the notifier abstraction is too generic, the slice could widen into event-bus design work.
- If the publisher migration misses one update source, Telegram push behavior may regress silently.
- If subscriber cleanup is wrong, closing/restarting the control server could leak duplicate subscriptions.

## Mitigations
- Keep the notifier API tiny and in-process only.
- Preserve the current publisher list explicitly in tests.
- Ensure shutdown closes the bridge and its notifier subscription together.

## Out of Scope
- UI live-update transports.
- External webhook/pubsub integrations.
- Direct control-action service extraction.
- Multi-process fanout or distributed messaging.
