#!/usr/bin/env bash
set -euo pipefail
PROJECT_ROOT="${1:-$PWD}"
RUNTIME_ROOT="${2:-$PROJECT_ROOT/tools/paddleocr-runtime}"
KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_PYTHON="${PYTHON:-python3}"

"$BASE_PYTHON" - <<'PY'
import platform, sys
v = sys.version_info
if not ((3,9) <= (v.major,v.minor) <= (3,13)):
    raise SystemExit(f"Python 3.9–3.13 is required; found {v.major}.{v.minor}")
if platform.machine().lower() not in ("x86_64", "amd64"):
    raise SystemExit(f"This setup script targets x86-64 CPU Linux; found {platform.machine()}")
print(f"Using Python {sys.version.split()[0]} on {platform.machine()}")
PY

mkdir -p "$RUNTIME_ROOT"
VENV="$RUNTIME_ROOT/venv"
MODELS="$RUNTIME_ROOT/models"
"$BASE_PYTHON" -m venv "$VENV"
PY="$VENV/bin/python"
"$PY" -m pip install --upgrade pip
"$PY" -m pip install --only-binary=:all: paddlepaddle==3.3.1
"$PY" -m pip install paddleocr==3.7.0
export PADDLE_PDX_MODEL_SOURCE="${PADDLE_PDX_MODEL_SOURCE:-BOS}"
"$PY" "$KIT_DIR/prepare_paddleocr_models.py" --models-dir "$MODELS"

cat > "$RUNTIME_ROOT/paddleocr-env.sh" <<EOF
export PADDLEOCR_PYTHON_BIN='$PY'
export PADDLEOCR_DET_MODEL_DIR='$MODELS/PP-OCRv6_medium_det'
export PADDLEOCR_REC_MODEL_DIR='$MODELS/PP-OCRv6_medium_rec'
EOF
printf 'PaddleOCR is installed and locally model-staged.\nEnvironment: %s\nModels: %s\nEnvironment file: %s\n' "$PY" "$MODELS" "$RUNTIME_ROOT/paddleocr-env.sh"
if [[ -f "$PROJECT_ROOT/scripts/run-offline-paddleocr-benchmark.js" ]] && command -v node >/dev/null 2>&1; then
  # shellcheck disable=SC1090
  source "$RUNTIME_ROOT/paddleocr-env.sh"
  (cd "$PROJECT_ROOT" && node scripts/run-offline-paddleocr-benchmark.js) || {
    echo 'WARNING: installation succeeded, but the project benchmark failed; inspect testdata/ocr-acceptance/paddleocr-raw-benchmark.json.' >&2
  }
fi
