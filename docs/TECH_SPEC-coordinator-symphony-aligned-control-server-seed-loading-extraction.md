# TECH_SPEC - Coordinator Symphony-Aligned Control Server Seed Loading Extraction

## Summary

Extract the five JSON seed reads from `ControlServer.start()` into one helper so the server method keeps token generation, seeded runtime assembly, request shell creation, bootstrap assembly, startup sequencing, and ready-instance return while seed hydration moves behind a bounded seam.

## Current State

After `1085`, `ControlServer.start()` still performs these inline file reads before seeded runtime assembly:

1. `readJsonFile<ControlState>(controlPath)`
2. `readJsonFile<ConfirmationStoreSnapshot>(confirmationsPath)`
3. `readJsonFile<{ questions?: QuestionRecord[] }>(questionsPath)`
4. `readJsonFile<{ tokens?: DelegationTokenRecord[] }>(delegationTokensPath)`
5. `readJsonFile<LinearAdvisoryState>(join(runDir, LINEAR_ADVISORY_STATE_FILE))`

This block is the last direct seed-hydration cluster in the method.

## Symphony Alignment Note

The real upstream Symphony checkout keeps startup config assembly separate from web endpoint and controller behavior. CO should not copy Elixir/Phoenix structure directly, but the same boundary principle applies here: seed/runtime input loading is a startup concern and should not stay interleaved with the request shell or lifecycle composition.

## Proposed Design

### 1. Control-local seed-loading helper

Introduce one helper, likely `readControlServerSeeds(...)`, in a control-local module such as `controlServerSeedLoading.ts`.

It should receive:
- `paths`

It should own:
- the five seed-file reads,
- the `join(runDir, LINEAR_ADVISORY_STATE_FILE)` resolution,
- the local JSON read helper used for tolerant `ENOENT -> null` behavior.

It should return:
- `controlSeed`
- `confirmationsSeed`
- `questionsSeed`
- `delegationSeed`
- `linearAdvisorySeed`

### 2. `ControlServer.start()` stays the composition shell

`ControlServer.start()` should keep:
- token generation,
- seed-loading delegation,
- seeded runtime assembly delegation,
- request shell creation,
- `ControlServer` instance construction,
- bootstrap assembly delegation,
- startup-sequence delegation,
- ready-instance return.

It should stop reading the seed files inline.

### 3. Explicit exclusions

This slice must not:
- change token generation,
- change seeded runtime assembly,
- change request-shell behavior,
- change bootstrap assembly or startup sequencing,
- change route logic or shutdown ordering,
- split seed loading into multiple helpers/files.

## Validation

- Add a focused helper test file for seed loading.
- Keep or extend targeted `ControlServer.test.ts` coverage for:
  - missing seed files remaining non-fatal,
  - loaded seed payloads flowing unchanged into the server startup path.
- Run the required validation bundle and sync task/docs mirrors.
