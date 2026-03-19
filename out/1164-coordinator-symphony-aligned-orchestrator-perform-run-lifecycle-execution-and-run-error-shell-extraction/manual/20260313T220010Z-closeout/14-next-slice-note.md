# Next Slice Note

After `1164`, do not continue micro-slicing `performRunLifecycle(...)`.

The next truthful move is a broader orchestrator-surface reassessment around the duplicated public run-entry lifecycle shared across `start()` and `resume()`:

- prepare/load
- manifest and persister setup
- control-plane lifecycle startup
- run-event publisher creation
- `performRunLifecycle(...)`
- cleanup / handoff

That is now the real remaining design boundary. The `performRunLifecycle(...)` body is thin enough that another micro-helper extraction would be artificial.
