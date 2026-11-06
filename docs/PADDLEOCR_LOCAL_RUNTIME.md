> **Current architecture override (2026-11-05):** PaddleOCR runtime is a downstream local reader for the raster rendered from the OCR.Space Engine 2 searchable PDF. It must not independently read the original screenshot after the PDF-first stage. Historical install/benchmark notes remain provenance.

# PaddleOCR local runtime

The runtime is an optional local OCR benchmark engine. The Node/Tesseract bot remains the authoritative pipeline until identical-fixture results demonstrate that PaddleOCR improves field/record accuracy without unacceptable false acceptance.

## Windows install

From the project root (`package.json` and `scripts\run-offline-paddleocr-benchmark.js` present), run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\install-paddleocr-windows.ps1" -ProjectRoot (Get-Location).Path
```

The script installs isolated CPU-only PaddlePaddle 3.3.1 and PaddleOCR 3.7.0, warms English PP-OCRv6 medium detection/recognition models, stages their files under `%LOCALAPPDATA%\WoWSYOLO\PaddleOCR\models`, and then verifies local inference with socket connections blocked. It sets `PADDLEOCR_PYTHON_BIN`, `PADDLEOCR_DET_MODEL_DIR`, and `PADDLEOCR_REC_MODEL_DIR` as per-user environment variables for the existing raw benchmark wrapper.

Python 3.9–3.13 x64 is required; Python 3.12 is preferred. The setup downloads packages and model files during provisioning, but inference is local and does not call any cloud OCR/vision API. Inspect `install-manifest.json` and `models\paddleocr-model-manifest.json` for package versions, model file hashes, and the offline smoke result.

## Current environment status

The assistant execution container is currently unable to resolve/reach package indexes, so PaddleOCR and its weights could not be installed in that environment during this task. Do not interpret the presence of installer scripts or an empty/partial runtime directory as a successful install. Run `scripts/install-paddleocr-linux.sh` after package/model host access is restored. The project-specific benchmark remains explicitly offline and refuses to fetch packages or model weights.

## Model and version choice

The setup pins PaddleOCR 3.7.0 and CPU PaddlePaddle 3.3.1 and targets the official English PP-OCRv6 medium text detector and recognizer, the current default model family in the official PaddleOCR quick start/documentation as checked 2026-10-26. These models are candidates only; the installation smoke test is not an accuracy claim. Run the raw benchmark and then integrated field-specific acceptance before considering any candidate-selection changes.

## Linux install

```bash
bash scripts/install-paddleocr-linux.sh "$(pwd)" "$(pwd)/tools/paddleocr-runtime"
```
