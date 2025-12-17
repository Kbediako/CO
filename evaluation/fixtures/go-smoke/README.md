# Go Smoke Fixture

This fixture validates the Go module adapter using a tiny package and unit test.

- `go build ./...` compiles all packages in the module.
- `go test ./...` runs the unit test suite.
- `go vet ./...` performs basic static analysis checks.

The evaluation harness copies the fixture into a temporary directory before running to ensure isolation.

