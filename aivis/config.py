"""Runtime configuration, read from environment variables (and an optional .env file)."""
import os
from pathlib import Path


def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv(Path.cwd() / ".env")


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default)


DATABASE_PATH = env("AIVIS_DB", "data/aivis.db")

# How many times each prompt is asked per model per run. LLM answers are
# non-deterministic, so >1 gives steadier numbers at proportionally higher cost.
SAMPLES_PER_PROMPT = int(env("AIVIS_SAMPLES", "1"))

# Hour of day (UTC) for the daily scheduled run. Set AIVIS_SCHEDULE=off to disable.
SCHEDULE = env("AIVIS_SCHEDULE", "on").lower() != "off"
SCHEDULE_HOUR_UTC = int(env("AIVIS_SCHEDULE_HOUR", "6"))

# Optional HTTP basic auth for the dashboard.
AUTH_USER = env("AIVIS_USER", "")
AUTH_PASSWORD = env("AIVIS_PASSWORD", "")

# Which provider does LLM-assisted analysis (sentiment, prompt + competitor
# suggestions). "auto" picks the first configured provider; "none" = heuristics only.
ANALYSIS_PROVIDER = env("AIVIS_ANALYSIS_PROVIDER", "auto")

MAX_WORKERS = int(env("AIVIS_WORKERS", "4"))
