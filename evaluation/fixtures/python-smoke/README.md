# Python Smoke Fixture

This fixture validates the Python adapter via lightweight scripts that avoid external dependencies.

- `scripts/build.py` checks for the required project files and simulates a dependency install.
- `scripts/test.py` executes a tiny greeting helper and exits non-zero if expectations fail.

The evaluation harness copies the fixture into a temporary directory before running to ensure isolation.
