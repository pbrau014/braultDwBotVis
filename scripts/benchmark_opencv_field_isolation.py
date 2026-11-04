#!/usr/bin/env python3
"""Offline geometry-proposal coverage benchmark for the approved 16-image corpus."""
import hashlib
import json
from pathlib import Path
import sys
import time

try:
    import cv2
    import numpy as np
    from opencv_field_isolation import analyze
except Exception as exc:
    print(json.dumps({'schemaVersion': 1, 'status': 'blocked', 'reason': f'{type(exc).__name__}: {exc}', 'networkCalls': 0}))
    sys.exit(3)

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = (ROOT / 'testdata' / 'additional-screenshot-ground-truth.json').resolve()
IMAGES = (ROOT / 'fixtures' / 'additional-screenshots').resolve()
OUTPUT = (ROOT / 'testdata' / 'ocr-acceptance' / 'opencv-field-isolation-benchmark.json').resolve()

def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()

def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    records = []
    failures = []
    started_all = time.perf_counter()
    for entry in manifest['records']:
        filename = entry['filename']
        image_path = (IMAGES / filename).resolve()
        if IMAGES not in image_path.parents or not image_path.is_file():
            failures.append({'key': entry['key'], 'reason': 'missing image or path escaped approved corpus'})
            continue
        image_hash = digest(image_path)
        if image_hash != entry['sha256']:
            failures.append({'key': entry['key'], 'reason': 'SHA-256 differs from approved manifest'})
            continue
        raw = np.fromfile(str(image_path), dtype=np.uint8)
        image = cv2.imdecode(raw, cv2.IMREAD_COLOR)
        if image is None:
            failures.append({'key': entry['key'], 'reason': 'OpenCV failed to decode image'})
            continue
        start = time.perf_counter()
        result = analyze(image)
        elapsed = (time.perf_counter() - start) * 1000
        h, w = image.shape[:2]
        proposals = {}
        for name, candidate in result.get('regions', {}).items():
            r = candidate.get('rect') or {}
            left, top, width, height = (r.get(k) for k in ('left', 'top', 'width', 'height'))
            bounded = all(isinstance(n, int) for n in (left, top, width, height)) and left >= 0 and top >= 0 and width >= 2 and height >= 2 and left + width <= w and top + height <= h
            proposals[name] = {'rect': r, 'score': candidate.get('score'), 'componentCount': candidate.get('componentCount'), 'bounded': bounded, 'method': candidate.get('method'), 'isolatedFromAdjacentUi': candidate.get('isolatedFromAdjacentUi', False)}
            if not bounded:
                failures.append({'key': entry['key'], 'region': name, 'reason': 'proposal out of bounds'})
        records.append({'key': entry['key'], 'filename': filename, 'imageSha256': image_hash, 'width': w, 'height': h, 'status': result.get('status'), 'elapsedMs': round(elapsed, 3), 'regionCount': len(proposals), 'regions': proposals, 'componentCountsBySeed': result.get('componentCountsBySeed', {}), 'preprocessing': result.get('preprocessing', []), 'acceptancePolicy': result.get('acceptancePolicy')})
    complete = len(records) == len(manifest['records']) and not failures and all(record['status'] in ('ok', 'no-reliable-regions') for record in records)
    elapsed = (time.perf_counter() - started_all) * 1000
    report = {
        'schemaVersion': 1, 'status': 'complete' if complete else 'failed',
        'benchmarkType': 'OpenCV geometry-proposal coverage only; not OCR accuracy or field correctness',
        'networkCalls': 0, 'manifestSha256': digest(MANIFEST), 'imageCount': len(manifest['records']),
        'processedCount': len(records), 'failedCount': len(failures), 'opencvVersion': cv2.__version__,
        'totalElapsedMs': round(elapsed, 3),
        'metrics': {
            'imagesProcessed': len(records),
            'imagesWithAnyProposal': sum(1 for r in records if r['regionCount'] > 0),
            'imagesWithAllFiveProposals': sum(1 for r in records if r['regionCount'] == 5),
            'proposalCount': sum(r['regionCount'] for r in records),
            'boundedProposalCount': sum(1 for r in records for item in r['regions'].values() if item['bounded']),
            'meanAnalysisMs': round(sum(r['elapsedMs'] for r in records) / len(records), 3) if records else None,
        },
        'records': records, 'failures': failures,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temp = OUTPUT.with_suffix('.json.tmp')
    temp.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    temp.replace(OUTPUT)
    print(f"{report['status'].upper()}: OpenCV proposals for {len(records)}/{len(manifest['records'])} approved images; {report['metrics']['proposalCount']} proposals; report={OUTPUT}")
    return 0 if complete else 1

if __name__ == '__main__':
    sys.exit(main())
