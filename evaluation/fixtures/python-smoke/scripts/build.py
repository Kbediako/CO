import pathlib

fixture_dir = pathlib.Path(__file__).resolve().parents[1]
requirements = fixture_dir / "requirements.txt"

if not requirements.exists():
    raise SystemExit("build: requirements.txt missing")

print("build check passed")
