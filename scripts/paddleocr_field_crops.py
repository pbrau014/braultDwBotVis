#!/usr/bin/env python3
"""Local-only PaddleOCR field-crop helper; no downloads or external services.

Input JSON on stdin: {schemaVersion, imagePath, crops:[{id,fields,rect}]}
Output JSON on stdout. PaddleOCR sees only bounded ROI arrays from the supplied image.
All socket connections are blocked before importing Paddle/PaddleOCR.
"""
from __future__ import annotations

import contextlib
import hashlib
import importlib.metadata
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
    raise RuntimeError('Network access is disabled by the PaddleOCR field-crop fallback.')

# Install network guards before the OCR engine imports any package that could use a socket.
socket.socket.connect = _blocked_network  # type: ignore[assignment]
socket.socket.connect_ex = _blocked_network  # type: ignore[assignment]
socket.create_connection = _blocked_network  # type: ignore[assignment]
os.environ['DISABLE_MODEL_SOURCE_CHECK'] = 'True'
os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'
os.environ['PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT'] = 'False'


def version(package: str) -> str | None:
    try:
        return importlib.metadata.version(package)
    except Exception:
        return None


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def model_files_present(path: Path) -> bool:
    if not path.is_dir():
        return False
    names = {entry.name.lower() for entry in path.rglob('*') if entry.is_file()}
    has_model = any(name.endswith(('.pdmodel', '.json', '.onnx')) for name in names)
    has_weights = any(name.endswith(('.pdiparams', '.onnx', '.safetensors')) for name in names)
    return has_model and has_weights


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
                obj = json.loads(obj)
            except Exception:
                return
        if isinstance(obj, dict):
            if isinstance(obj.get('res'), (dict, list)):
                walk(obj['res']); return
            texts = obj.get('rec_texts')
            if texts is None:
                texts = obj.get('texts')
            if isinstance(texts, list):
                # Avoid Python truth-value evaluation on NumPy arrays, which is
                # ambiguous for PaddleX rec_scores/rec_boxes arrays.
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
                if hasattr(scores, 'tolist'):
                    scores = scores.tolist()
                if hasattr(boxes, 'tolist'):
                    boxes = boxes.tolist()
                for index, text in enumerate(texts):
                    box = boxes[index] if index < len(boxes) else None
                    if hasattr(box, 'tolist'):
                        box = box.tolist()
                    add(text, scores[index] if index < len(scores) else None, box)
                return
            if isinstance(obj.get('text'), str):
                add(obj.get('text'), obj.get('score'), obj.get('box'))
                return
            for value in obj.values():
                if isinstance(value, (dict, list, tuple)):
                    walk(value)
        elif isinstance(obj, (list, tuple)):
            if len(obj) >= 2 and isinstance(obj[1], (list, tuple)) and obj[1] and isinstance(obj[1][0], str):
                add(obj[1][0], obj[1][1] if len(obj[1]) > 1 else None, obj[0]); return
            for value in obj:
                walk(value)
    walk(result)
    return rows


def create_engine(PaddleOCR: Any, det_dir: Path, rec_dir: Path) -> tuple[Any, str]:
    params = inspect.signature(PaddleOCR.__init__).parameters
    kwargs: dict[str, Any] = {}
    if 'text_detection_model_dir' in params and 'text_recognition_model_dir' in params:
        kwargs['text_detection_model_dir'] = str(det_dir)
        kwargs['text_recognition_model_dir'] = str(rec_dir)
        for name, value in {
            'use_doc_orientation_classify': False,
            'use_doc_unwarping': False,
            'use_textline_orientation': False,
            'device': 'cpu',
            'enable_mkldnn': False,
        }.items():
            if name in params:
                kwargs[name] = value
        family = 'paddleocr-v3-style-local-model-dir-api'
    elif 'det_model_dir' in params and 'rec_model_dir' in params:
        kwargs['det_model_dir'] = str(det_dir)
        kwargs['rec_model_dir'] = str(rec_dir)
        if 'use_angle_cls' in params:
            kwargs['use_angle_cls'] = False
        if 'use_gpu' in params:
            kwargs['use_gpu'] = False
        if 'enable_mkldnn' in params:
            kwargs['enable_mkldnn'] = False
        family = 'paddleocr-v2-style-local-model-dir-api'
    else:
        raise RuntimeError('No supported constructor with explicit local model directories; refusing implicit default models.')
    if 'show_log' in params:
        kwargs['show_log'] = False
    return PaddleOCR(**kwargs), family


def validate_rect(rect: Any, width: int, height: int) -> tuple[int, int, int, int]:
    if not isinstance(rect, dict):
        raise ValueError('crop rect must be an object')
    values = [rect.get('left'), rect.get('top'), rect.get('width'), rect.get('height')]
    if any(not isinstance(value, (int, float)) for value in values):
        raise ValueError('crop rect values must be numeric')
    left, top, crop_width, crop_height = [int(value) for value in values]
    if left < 0 or top < 0 or crop_width < 2 or crop_height < 2 or left + crop_width > width or top + crop_height > height:
        raise ValueError('crop rect is outside the source image bounds')
    if crop_width > width * 0.72 or crop_height > height * 0.32:
        raise ValueError('crop exceeds field-crop width/height limits')
    return left, top, crop_width, crop_height


def main() -> int:
    try:
        request = json.loads(sys.stdin.read())
    except Exception as exc:
        print(json.dumps({'schemaVersion': 1, 'status': 'error', 'error': f'invalid request JSON: {exc}', 'networkAttemptCount': len(NETWORK_ATTEMPTS)}))
        return 2
    if request.get('schemaVersion') != 1 or not isinstance(request.get('crops'), list):
        print(json.dumps({'schemaVersion': 1, 'status': 'error', 'error': 'unsupported request schema', 'networkAttemptCount': len(NETWORK_ATTEMPTS)}))
        return 2

    det_dir = Path(os.environ.get('PADDLEOCR_DET_MODEL_DIR', '')).expanduser().resolve()
    rec_dir = Path(os.environ.get('PADDLEOCR_REC_MODEL_DIR', '')).expanduser().resolve()
    if not model_files_present(det_dir) or not model_files_present(rec_dir):
        print(json.dumps({'schemaVersion': 1, 'status': 'blocked', 'error': 'explicit local detection/recognition model files are unavailable', 'networkAttemptCount': len(NETWORK_ATTEMPTS), 'results': []}))
        return 3

    image_path = Path(str(request.get('imagePath') or '')).resolve()
    if not image_path.is_file():
        print(json.dumps({'schemaVersion': 1, 'status': 'error', 'error': 'local source image is missing', 'networkAttemptCount': len(NETWORK_ATTEMPTS), 'results': []}))
        return 3

    # Import OpenCV/Paddle only after installing the no-network guard. Redirect
    # stdout emitted by PaddleX during construction/inference so stdout remains
    # one parseable JSON document for the Node caller.
    started_all = time.perf_counter()
    try:
        import cv2
        import numpy as np
        import paddle
        import paddleocr
        from paddleocr import PaddleOCR
        with contextlib.redirect_stdout(sys.stderr):
            engine, api_family = create_engine(PaddleOCR, det_dir, rec_dir)
            # The Node caller uses a random .img temp suffix. Decode by file
            # signature (not extension) so PNG and JPEG byte streams both work.
            encoded_image = image_path.read_bytes()
            source = cv2.imdecode(np.frombuffer(encoded_image, dtype=np.uint8), cv2.IMREAD_COLOR)
            if source is None:
                raise RuntimeError('OpenCV could not decode the source image bytes')
            height, width = source.shape[:2]
            results = []
            for crop_spec in request['crops']:
                item_started = time.perf_counter()
                try:
                    left, top, crop_width, crop_height = validate_rect(crop_spec.get('rect'), width, height)
                    crop = source[top:top + crop_height, left:left + crop_width].copy()
                    if crop.size == 0:
                        raise ValueError('crop image was empty')
                    # A numpy ROI keeps pixel processing local/in-memory and avoids
                    # writing derivative crops to disk or invoking remote OCR.
                    raw = list(engine.predict(crop)) if hasattr(engine, 'predict') else engine.ocr(crop, cls=False)
                    lines = normalize_results(raw)
                    results.append({
                        'id': str(crop_spec.get('id') or ''),
                        'fields': [str(value) for value in crop_spec.get('fields', []) if isinstance(value, str)],
                        'rect': {'left': left, 'top': top, 'width': crop_width, 'height': crop_height},
                        'elapsedMs': round((time.perf_counter() - item_started) * 1000, 3),
                        'lines': lines,
                        'rawText': '\n'.join(line['text'] for line in lines),
                        'lineCount': len(lines),
                    })
                except Exception as exc:
                    results.append({
                        'id': str(crop_spec.get('id') or ''),
                        'fields': [str(value) for value in crop_spec.get('fields', []) if isinstance(value, str)],
                        'rect': crop_spec.get('rect'), 'elapsedMs': round((time.perf_counter() - item_started) * 1000, 3),
                        'error': f'{type(exc).__name__}: {exc}', 'rawText': '', 'lines': [], 'lineCount': 0,
                    })
        payload = {
            'schemaVersion': 1, 'status': 'blocked' if NETWORK_ATTEMPTS else 'complete' if all('error' not in item for item in results) else 'partial',
            'networkAttemptCount': len(NETWORK_ATTEMPTS), 'networkAttempts': NETWORK_ATTEMPTS,
            'elapsedMs': round((time.perf_counter() - started_all) * 1000, 3),
            'modelVersions': {'paddlepaddle': getattr(paddle, '__version__', None), 'paddleocr': getattr(paddleocr, '__version__', None)},
            'apiFamily': api_family, 'imageSha256': sha256(image_path), 'sourceWidth': width, 'sourceHeight': height,
            'results': results,
        }
        print(json.dumps(payload, ensure_ascii=True, separators=(',', ':')))
        # Keep valid per-crop results even when one ROI failed; the Node layer
        # filters each failed crop and preserves the rest. Network attempts still fail closed.
        return 3 if NETWORK_ATTEMPTS else 0
    except Exception as exc:
        payload = {'schemaVersion': 1, 'status': 'error', 'error': f'{type(exc).__name__}: {exc}',
                   'networkAttemptCount': len(NETWORK_ATTEMPTS), 'networkAttempts': NETWORK_ATTEMPTS,
                   'elapsedMs': round((time.perf_counter() - started_all) * 1000, 3), 'results': []}
        print(json.dumps(payload, ensure_ascii=True, separators=(',', ':')))
        return 3 if NETWORK_ATTEMPTS else 1


if __name__ == '__main__':
    raise SystemExit(main())
