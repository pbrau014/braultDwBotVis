#!/usr/bin/env python3
"""Offline-only raw PaddleOCR benchmark; never downloads models or calls services.

Required local environment variables:
  PADDLEOCR_DET_MODEL_DIR - pre-staged local detection model directory
  PADDLEOCR_REC_MODEL_DIR - pre-staged local recognition model directory

This script deliberately blocks all socket connections before importing PaddleOCR.
If local dependencies or models are missing, it writes a blocked report and exits 3.
It measures raw full-screen recognition only; it does not claim integrated field accuracy.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import inspect
import json
import os
from pathlib import Path
import socket
import sys
import time
from typing import Any

NETWORK_ATTEMPTS: list[str] = []

def _blocked_network(*args: Any, **kwargs: Any) -> Any:
    origin = str(args[0]) if args else 'socket'
    NETWORK_ATTEMPTS.append(origin[:200])
    raise RuntimeError('Network access is disabled by the offline PaddleOCR benchmark.')

# Prevent Paddle/PaddleOCR or a transitive dependency from fetching models or phoning home.
socket.socket.connect = _blocked_network  # type: ignore[assignment]
socket.socket.connect_ex = _blocked_network  # type: ignore[assignment]
socket.create_connection = _blocked_network  # type: ignore[assignment]
os.environ['DISABLE_MODEL_SOURCE_CHECK'] = 'True'
os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'
os.environ['PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT'] = 'False'


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def write_report(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    temp.replace(path)


def blocked_payload(reason: str, manifest_path: Path, manifest: dict[str, Any] | None) -> dict[str, Any]:
    return {
        'schemaVersion': 1,
        'status': 'blocked',
        'blockedReason': reason,
        'networkPolicy': 'all socket connections blocked before PaddleOCR import; no external API/model fetch allowed',
        'networkAttemptCount': len(NETWORK_ATTEMPTS),
        'networkAttempts': NETWORK_ATTEMPTS,
        'benchmarkType': 'raw-full-screen-ocr-only; not integrated field-specific pipeline',
        'manifest': str(manifest_path),
        'manifestSha256': sha256(manifest_path) if manifest_path.is_file() else None,
        'fixtureCount': len((manifest or {}).get('records', [])),
        'packageVersion': None,
        'paddleVersion': None,
        'opencvVersion': None,
        'records': [],
        'metrics': None,
    }


def has_local_model_files(path: Path) -> bool:
    if not path.is_dir():
        return False
    # Paddle model bundles have changed file naming across versions. Require a
    # nonempty directory and one recognizable inference-model parameter pair,
    # rather than accepting an empty or mispointed directory that may trigger download.
    files = [item for item in path.rglob('*') if item.is_file()]
    if not files:
        return False
    names = {item.name.lower() for item in files}
    model_like = any(name.endswith(('.pdmodel', '.json', '.onnx')) for name in names)
    weights_like = any(name.endswith(('.pdiparams', '.onnx', '.safetensors')) for name in names)
    return model_like and weights_like


def construct_local_engine(PaddleOCR: Any, det_dir: Path, rec_dir: Path) -> tuple[Any, str]:
    params = inspect.signature(PaddleOCR.__init__).parameters
    kwargs: dict[str, Any] = {}
    if 'text_detection_model_dir' in params and 'text_recognition_model_dir' in params:
        kwargs['text_detection_model_dir'] = str(det_dir)
        kwargs['text_recognition_model_dir'] = str(rec_dir)
        family = 'paddleocr-v3-style-local-model-dir-api'
        for name, value in {
            'use_doc_orientation_classify': False,
            'use_doc_unwarping': False,
            'use_textline_orientation': False,
            'device': 'cpu',
        }.items():
            if name in params:
                kwargs[name] = value
        # PaddlePaddle 3.3.0/3.3.1 CPU inference can fail in the oneDNN/PIR
        # conversion path for PP-OCRv6 detection. This is the documented
        # PaddleOCR-level bypass; environment flags alone are not sufficient.
        kwargs['enable_mkldnn'] = False
    elif 'det_model_dir' in params and 'rec_model_dir' in params:
        kwargs['det_model_dir'] = str(det_dir)
        kwargs['rec_model_dir'] = str(rec_dir)
        family = 'paddleocr-v2-style-local-model-dir-api'
        if 'use_angle_cls' in params:
            kwargs['use_angle_cls'] = False
        if 'use_gpu' in params:
            kwargs['use_gpu'] = False
        if 'enable_mkldnn' in params:
            kwargs['enable_mkldnn'] = False
    else:
        raise RuntimeError('Installed PaddleOCR constructor exposes no recognized explicit local detection/recognition model-dir API; refusing implicit default models.')
    if 'show_log' in params:
        kwargs['show_log'] = False
    engine = PaddleOCR(**kwargs)
    return engine, family


def normalize_results(result: Any) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    def add(text: Any, score: Any = None, box: Any = None) -> None:
        value = str(text or '').strip()
        if not value:
            return
        try:
            confidence = float(score) if score is not None else None
        except (TypeError, ValueError):
            confidence = None
        rows.append({'text': value, 'score': confidence, 'box': box})

    def walk(obj: Any) -> None:
        if hasattr(obj, 'json'):
            try:
                obj = obj.json
            except Exception:
                pass
        if isinstance(obj, str):
            try:
                parsed = json.loads(obj)
            except Exception:
                return
            walk(parsed)
            return
        if isinstance(obj, dict):
            if isinstance(obj.get('res'), (dict, list)):
                walk(obj['res'])
                return
            texts = obj.get('rec_texts')
            if texts is None:
                texts = obj.get('texts')
            if isinstance(texts, list):
                scores = obj.get('rec_scores')
                if scores is None:
                    scores = obj.get('scores')
                if scores is None:
                    scores = []
                boxes = obj.get('rec_boxes')
                if boxes is None:
                    boxes = obj.get('dt_polys')
                if boxes is None:
                    boxes = obj.get('boxes')
                if boxes is None:
                    boxes = []
                for index, text in enumerate(texts):
                    box = boxes[index] if index < len(boxes) else None
                    if hasattr(box, 'tolist'):
                        box = box.tolist()
                    add(text, scores[index] if index < len(scores) else None, box)
                return
            # PaddleOCR <=2.x result item: [box, (text, score)].
            if isinstance(obj.get('text'), str):
                add(obj.get('text'), obj.get('score'), obj.get('box'))
            else:
                for value in obj.values():
                    if isinstance(value, (dict, list, tuple)):
                        walk(value)
            return
        if isinstance(obj, (list, tuple)):
            if len(obj) >= 2 and isinstance(obj[1], (list, tuple)) and obj[1] and isinstance(obj[1][0], str):
                add(obj[1][0], obj[1][1] if len(obj[1]) > 1 else None, obj[0])
                return
            for value in obj:
                walk(value)
    walk(result)
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', default='testdata/ocr-benchmark-manifest-v1.json')
    parser.add_argument('--images-dir', default='fixtures/additional-screenshots')
    parser.add_argument('--output', default='testdata/ocr-acceptance/paddleocr-raw-benchmark.json')
    args = parser.parse_args()
    manifest_path = Path(args.manifest).resolve()
    images_dir = Path(args.images_dir).resolve()
    output_path = Path(args.output).resolve()
    manifest: dict[str, Any] | None = None
    try:
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    except Exception as exc:
        report = blocked_payload(f'Could not read benchmark manifest: {exc}', manifest_path, None)
        write_report(output_path, report)
        print(f"BLOCKED: {report['blockedReason']}; report={output_path}", file=sys.stderr)
        return 3

    missing_packages = [name for name in ('paddle', 'paddleocr') if importlib.util.find_spec(name) is None]
    if missing_packages:
        report = blocked_payload(f'Local Python packages not installed: {", ".join(missing_packages)}. Benchmark intentionally does not install packages.', manifest_path, manifest)
        report['missingPackages'] = missing_packages
        write_report(output_path, report)
        print(f"BLOCKED: {report['blockedReason']}; no install/download attempted; report={output_path}", file=sys.stderr)
        return 3

    det_dir = Path(os.environ.get('PADDLEOCR_DET_MODEL_DIR', '')).expanduser().resolve()
    rec_dir = Path(os.environ.get('PADDLEOCR_REC_MODEL_DIR', '')).expanduser().resolve()
    if not has_local_model_files(det_dir) or not has_local_model_files(rec_dir):
        report = blocked_payload('Local detection and recognition model directories must both be pre-staged and contain model plus weights files.', manifest_path, manifest)
        report['detModelDir'] = str(det_dir)
        report['recModelDir'] = str(rec_dir)
        write_report(output_path, report)
        print(f"BLOCKED: PaddleOCR local model directories unavailable; no download attempted; report={output_path}", file=sys.stderr)
        return 3

    try:
        import paddle
        import paddleocr
        from paddleocr import PaddleOCR
    except Exception as exc:
        report = blocked_payload(f'Paddle/PaddleOCR not importable locally: {type(exc).__name__}: {exc}', manifest_path, manifest)
        report['detModelDir'] = str(det_dir)
        report['recModelDir'] = str(rec_dir)
        write_report(output_path, report)
        print(f"BLOCKED: PaddleOCR runtime unavailable locally; no download attempted; report={output_path}", file=sys.stderr)
        return 3

    try:
        engine, apiFamily = construct_local_engine(PaddleOCR, det_dir, rec_dir)
    except Exception as exc:
        report = blocked_payload(f'Could not initialize PaddleOCR with explicit local models: {type(exc).__name__}: {exc}', manifest_path, manifest)
        report['packageVersion'] = getattr(paddleocr, '__version__', None)
        report['paddleVersion'] = getattr(paddle, '__version__', None)
        write_report(output_path, report)
        print(f"BLOCKED: {report['blockedReason']}; no remote fallback allowed; report={output_path}", file=sys.stderr)
        return 3

    records = []
    failures = []
    benchmark_entries = manifest.get('records', [])
    print(f'RAW PaddleOCR benchmark: {len(benchmark_entries)} images; local models only; oneDNN disabled; network blocked.', flush=True)
    for index, entry in enumerate(benchmark_entries, start=1):
        filename = str(entry.get('filename') or '')
        image_path = (images_dir / filename).resolve()
        # Do not allow manifest paths to escape the specified images directory.
        if images_dir not in image_path.parents or not image_path.is_file():
            failures.append({'key': entry.get('key'), 'filename': filename, 'error': 'missing image or path escapes images directory'})
            continue
        image_hash = sha256(image_path)
        expected_hash = str(entry.get('sha256') or '').lower()
        if expected_hash and image_hash != expected_hash:
            failures.append({'key': entry.get('key'), 'filename': filename, 'error': 'image SHA-256 differs from approved manifest'})
            continue
        print(f'[{index}/{len(benchmark_entries)}] START {filename}', flush=True)
        started = time.perf_counter()
        try:
            if hasattr(engine, 'predict'):
                raw_result = list(engine.predict(str(image_path)))
            else:
                raw_result = engine.ocr(str(image_path), cls=False)
            elapsed = (time.perf_counter() - started) * 1000
            lines = normalize_results(raw_result)
            records.append({
                'key': entry.get('key'), 'filename': filename, 'imageSha256': image_hash,
                'elapsedMs': round(elapsed, 3), 'lineCount': len(lines),
                'rawText': '\n'.join(line['text'] for line in lines), 'lines': lines,
            })
            print(f'[{index}/{len(benchmark_entries)}] DONE {filename}: {elapsed:.1f} ms, {len(lines)} text lines', flush=True)
        except Exception as exc:
            records.append({'key': entry.get('key'), 'filename': filename, 'imageSha256': image_hash,
                            'elapsedMs': round((time.perf_counter() - started) * 1000, 3),
                            'error': f'{type(exc).__name__}: {exc}'})
            print(f'[{index}/{len(benchmark_entries)}] ERROR {filename}: {type(exc).__name__}: {exc}', file=sys.stderr, flush=True)
        if NETWORK_ATTEMPTS:
            break

    successful = [item for item in records if 'rawText' in item]
    report = {
        'schemaVersion': 1,
        'status': 'blocked' if NETWORK_ATTEMPTS else 'complete' if len(successful) == len(manifest.get('records', [])) and not failures else 'partial',
        'networkPolicy': 'all socket connections blocked before PaddleOCR import; no external API/model fetch allowed',
        'networkAttemptCount': len(NETWORK_ATTEMPTS), 'networkAttempts': NETWORK_ATTEMPTS,
        'benchmarkType': 'raw-full-screen-ocr-only; not integrated field-specific pipeline',
        'manifest': str(manifest_path), 'manifestSha256': sha256(manifest_path),
        'fixtureCount': len(manifest.get('records', [])), 'completedCount': len(successful),
        'failedCount': len(failures) + sum(1 for item in records if 'error' in item),
        'packageVersion': getattr(paddleocr, '__version__', None),
        'paddleVersion': getattr(paddle, '__version__', None),
        'opencvVersion': __import__('cv2').__version__ if _has_cv2() else None,
        'apiFamily': apiFamily,
        'detModelDir': str(det_dir), 'recModelDir': str(rec_dir),
        'records': records, 'failures': failures,
        'metrics': {
            'medianLatencyMs': _median([item['elapsedMs'] for item in successful]),
            'p95LatencyMs': _percentile([item['elapsedMs'] for item in successful], .95),
            'meanLatencyMs': round(sum(item['elapsedMs'] for item in successful) / len(successful), 3) if successful else None,
            'rawTextAvailable': len(successful),
            'exactFieldAccuracy': None,
            'completeRecordAccuracy': None,
            'note': 'Exact field and complete-record metrics intentionally unavailable: this artifact measures raw PaddleOCR text, not the integrated validated field pipeline.',
        },
    }
    write_report(output_path, report)
    if NETWORK_ATTEMPTS:
        print('BLOCKED: a network connection was attempted and blocked.', file=sys.stderr)
        return 3
    print(f"{report['status'].upper()}: {len(successful)}/{len(manifest.get('records', []))} raw images; report={output_path}")
    return 0 if report['status'] == 'complete' else 1


def _has_cv2() -> bool:
    try:
        import cv2  # type: ignore
        return True
    except Exception:
        return False


def _median(values: list[float]) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    mid = len(ordered) // 2
    return round((ordered[mid] if len(ordered) % 2 else (ordered[mid - 1] + ordered[mid]) / 2), 3)


def _percentile(values: list[float], p: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, int((len(ordered) - 1) * p + 0.999999)))
    return round(ordered[index], 3)


if __name__ == '__main__':
    sys.exit(main())
