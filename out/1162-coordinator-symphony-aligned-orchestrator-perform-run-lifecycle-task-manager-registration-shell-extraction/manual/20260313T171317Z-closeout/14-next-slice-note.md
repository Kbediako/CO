# Next Slice Note

Next truthful seam: the remaining guard-and-planning cluster still inline in `performRunLifecycle(...)` after the explicit privacy reset.

Bounded candidate scope:

- run `this.controlPlane.guard(...)`
- then run `this.scheduler.createPlanForRun(...)`
- return the pair `{ controlPlaneResult, schedulerPlan }` to the surrounding lifecycle

Keep out of scope:

- the explicit privacy reset immediately before the cluster
- task-manager registration owned by the `1162` helper
- `manager.execute(...)` error handling and `runError(...)` emission
- the completion helper extracted in `1161`
- public `start()` / `resume()` lifecycle entrypoints
