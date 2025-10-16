import sys

def greet(name: str) -> str:
    return f"Hello, {name}!"

if greet("Codex") != "Hello, Codex!":
    raise SystemExit("test: unexpected greeting output")

print("test check passed")
sys.exit(0)
