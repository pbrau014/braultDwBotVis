#!/usr/bin/env python3
"""Download/warm official PaddleOCR English PP-OCRv6 models once, then verify local-only inference.

This script performs inference locally. In warm mode it asks PaddleOCR to obtain the
official model files; after they are copied to --models-dir, verification blocks all
socket connections and passes explicit local model directories to PaddleOCR.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import shutil
import socket
import sys
import time
from typing import Any

MODEL_NAMES = ("PP-OCRv6_medium_det", "PP-OCRv6_medium_rec")
NETWORK_ATTEMPTS: list[str] = []


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def hash_tree(root: Path) -> list[dict[str, Any]]:
    files = []
    for p in sorted(root.rglob("*")):
        if p.is_file():
            files.append({"path": p.relative_to(root).as_posix(), "size": p.stat().st_size, "sha256": sha256(p)})
    return files


def has_model_files(root: Path) -> bool:
    if not root.is_dir():
        return False
    names = {p.name.lower() for p in root.rglob("*") if p.is_file()}
    has_config = any(n.endswith((".json", ".pdmodel", ".onnx")) for n in names)
    has_weights = any(n.endswith((".pdiparams", ".onnx", ".safetensors")) for n in names)
    return bool(has_config and has_weights)


def create_smoke_image(path: Path) -> None:
    import cv2
    import numpy as np

    image = np.full((170, 1100, 3), 255, dtype=np.uint8)
    cv2.putText(image, "WOWS XP 123456 FREE XP 7890", (22, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.55, (0, 0, 0), 3, cv2.LINE_AA)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(path), image):
        raise RuntimeError(f"Failed to write smoke image: {path}")


def get_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def make_engine(det_dir: Path | None = None, rec_dir: Path | None = None):
    from paddleocr import PaddleOCR

    kwargs: dict[str, Any] = {
        "lang": "en",
        "device": "cpu",
        "use_doc_orientation_classify": False,
        "use_doc_unwarping": False,
        "use_textline_orientation": False,
        "engine": "paddle",
    }
    if det_dir is not None and rec_dir is not None:
        # Explicit paths are mandatory in verification/production so default model
        # lookup cannot silently fetch a model at inference time.
        kwargs["text_detection_model_name"] = MODEL_NAMES[0]
        kwargs["text_detection_model_dir"] = str(det_dir)
        kwargs["text_recognition_model_name"] = MODEL_NAMES[1]
        kwargs["text_recognition_model_dir"] = str(rec_dir)
    return PaddleOCR(**kwargs)


def extract_texts(result: Any) -> list[str]:
    texts: list[str] = []
    def walk(obj: Any) -> None:
        if hasattr(obj, "json"):
            try:
                obj = obj.json
            except Exception:
                pass
        if isinstance(obj, str):
            try:
                obj = json.loads(obj)
            except Exception:
                return
        if isinstance(obj, dict):
            if isinstance(obj.get("res"), (dict, list)):
                walk(obj["res"])
                return
            values = obj.get("rec_texts")
            if isinstance(values, list):
                texts.extend(str(x) for x in values if str(x).strip())
                return
            for value in obj.values():
                if isinstance(value, (dict, list, tuple)) or hasattr(value, "json"):
                    walk(value)
        elif isinstance(obj, (list, tuple)):
            for value in obj:
                walk(value)
    walk(result)
    return texts


def block_network() -> None:
    def blocked(*args: Any, **kwargs: Any) -> Any:
        origin = str(args[0]) if args else "socket"
        NETWORK_ATTEMPTS.append(origin[:200])
        raise RuntimeError("Network is disabled during PaddleOCR offline verification.")
    socket.socket.connect = blocked  # type: ignore[assignment]
    socket.socket.connect_ex = blocked  # type: ignore[assignment]
    socket.create_connection = blocked  # type: ignore[assignment]


def write_manifest(models_dir: Path, cache_dir: Path, offline_result: dict[str, Any]) -> Path:
    manifest = {
        "schemaVersion": 1,
        "runtime": {"python": sys.version.split()[0], "platform": sys.platform,
                         "paddlepaddle": get_version("paddlepaddle"), "paddleocr": get_version("paddleocr")},
        "modelFamily": "PP-OCRv6 English medium (detection + recognition)",
        "models": {},
        "sourceCache": str(cache_dir),
        "localModelRoot": str(models_dir),
        "offlineInference": offline_result,
        "networkPolicy": "socket connection functions blocked for offline verification; inference uses explicit local model directories",
    }
    for name in MODEL_NAMES:
        root = models_dir / name
        manifest["models"][name] = {"path": str(root), "complete": has_model_files(root), "files": hash_tree(root)}
    out = models_dir / "paddleocr-model-manifest.json"
    out.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--models-dir", required=True, help="Destination containing local model subdirectories")
    parser.add_argument("--cache-dir", default=str(Path.home() / ".paddlex" / "official_models"))
    parser.add_argument("--skip-warm", action="store_true", help="Do not fetch/warm models; verify already staged files only")
    parser.add_argument("--smoke-image", default=None, help="Optional path for generated temporary smoke image")
    args = parser.parse_args()

    models_dir = Path(args.models_dir).expanduser().resolve()
    cache_dir = Path(args.cache_dir).expanduser().resolve()
    models_dir.mkdir(parents=True, exist_ok=True)
    smoke_image = Path(args.smoke_image).resolve() if args.smoke_image else models_dir.parent / "paddleocr-smoke-test.png"
    create_smoke_image(smoke_image)

    if not args.skip_warm:
        # PaddleOCR 3.7 documents PP-OCRv6 as the current default family. The explicit
        # English language choice targets the bot's Latin-character UI screenshots.
        os.environ.setdefault("PADDLE_PDX_MODEL_SOURCE", "BOS")
        print(f"Warming official PaddleOCR English models via configured official model source: {os.environ['PADDLE_PDX_MODEL_SOURCE']}", flush=True)
        engine = make_engine()
        warm_results = engine.predict(str(smoke_image))
        print(f"Warm inference returned {len(warm_results) if hasattr(warm_results, '__len__') else 'an iterable'} result item(s).", flush=True)

    if not cache_dir.is_dir():
        print(f"ERROR: PaddleX model cache was not found: {cache_dir}", file=sys.stderr)
        return 3
    for name in MODEL_NAMES:
        source = cache_dir / name
        if not has_model_files(source):
            print(f"ERROR: Expected official model files were not found at {source}. Cached model directories: {[p.name for p in cache_dir.iterdir() if p.is_dir()]}", file=sys.stderr)
            return 3
        dest = models_dir / name
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(source, dest)
        if not has_model_files(dest):
            print(f"ERROR: Staged model validation failed: {dest}", file=sys.stderr)
            return 3

    # Verify actual inference with network connection calls denied before importing
    # PaddleOCR. Explicit model_dir arguments should make the run self-contained.
    os.environ["DISABLE_MODEL_SOURCE_CHECK"] = "True"
    os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"
    os.environ["PADDLE_PDX_MODEL_SOURCE"] = "BOS"
    block_network()
    started = time.perf_counter()
    try:
        engine = make_engine(models_dir / MODEL_NAMES[0], models_dir / MODEL_NAMES[1])
        results = engine.predict(str(smoke_image))
        texts = extract_texts(results)
        if not results:
            raise RuntimeError("PaddleOCR predict() returned no result objects")
        if not texts:
            raise RuntimeError("PaddleOCR model loaded but returned no recognized text for the synthetic smoke image")
        offline_result = {
            "status": "passed",
            "elapsedSeconds": round(time.perf_counter() - started, 3),
            "recognizedTexts": texts,
            "networkAttemptCount": len(NETWORK_ATTEMPTS),
            "networkAttempts": NETWORK_ATTEMPTS,
        }
    except Exception as exc:
        offline_result = {
            "status": "failed",
            "elapsedSeconds": round(time.perf_counter() - started, 3),
            "error": f"{type(exc).__name__}: {exc}",
            "networkAttemptCount": len(NETWORK_ATTEMPTS),
            "networkAttempts": NETWORK_ATTEMPTS,
        }
        manifest_path = write_manifest(models_dir, cache_dir, offline_result)
        print(f"OFFLINE VERIFICATION FAILED. Manifest: {manifest_path}; details: {offline_result['error']}", file=sys.stderr)
        return 4

    manifest_path = write_manifest(models_dir, cache_dir, offline_result)
    print(json.dumps({"status": "installed-and-offline-verified", "paddlepaddle": get_version("paddlepaddle"), "paddleocr": get_version("paddleocr"), "modelsDir": str(models_dir), "manifest": str(manifest_path), "offlineSmoke": offline_result}, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
