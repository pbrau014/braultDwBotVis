> **Current architecture (2026-11-06):** PaddleOCR is an independent local reader. In a designated multi-provider run it receives the same original screenshot bytes as Azure, OCR.Space, Tesseract.js, and native Tesseract. OCR.Space PDF/raster outputs remain separate derivative evidence and do not replace the original input.

# PaddleOCR local runtime

The runtime is an optional independent local OCR reader. It must remain separate from Tesseract.js and native Tesseract evidence. Do not compare raw confidence scores across engines or allow PaddleOCR to override a conflicting mandatory field. Preserve its field candidates and unresolved disagreements for human review.

## Windows install

From the project root (`package.json` and `scripts\run-offline-paddleocr-benchmark.js` present), run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\install-paddleocr-windows.ps1" -ProjectRoot (Get-Location).Path
```

The script installs isolated CPU-only PaddlePaddle 3.3.1 and PaddleOCR 3.7.0, warms English PP-OCRv6 medium detection/recognition models, stages their files under `%LOCALAPPDATA%\WoWSYOLO\PaddleOCR\models`, and then verifies local inference with socket connections blocked. It sets `PADDLEOCR_PYTHON_BIN`, `PADDLEOCR_DET_MODEL_DIR`, and `PADDLEOCR_REC_MODEL_DIR` as per-user environment variables for the existing raw benchmark wrapper.

Python 3.9–3.13 x64 is required; Python 3.12 is preferred. The setup downloads packages and model files during provisioning, but inference is local and does not call any cloud OCR/vision API. Inspect `install-manifest.json` and `models\paddleocr-model-manifest.json` for package versions, model file hashes, and the offline smoke result.

## Current environment status

An installer script or model manifest is not proof that a runtime is installed. Verify the installed Python package versions, model hashes, offline inference smoke, and reader participation on the target Windows environment before reporting PaddleOCR as available. The project-specific benchmark remains explicitly offline and refuses to fetch packages or model weights.

## Model and version choice

The setup pins PaddleOCR 3.7.0 and CPU PaddlePaddle 3.3.1 and targets the English PP-OCRv6 medium detector and recognizer. These models are candidates only; installation and local inference do not establish screenshot accuracy. Compare per-field exact values against complete labelled ground truth and report false acceptance, unresolved fields, runtime, and reader disagreements before changing any acceptance policy.

## Linux install

```bash
bash scripts/install-paddleocr-linux.sh "$(pwd)" "$(pwd)/tools/paddleocr-runtime"
```
