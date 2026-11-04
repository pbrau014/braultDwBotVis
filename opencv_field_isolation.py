#!/usr/bin/env python3
"""Local-only OpenCV geometry proposals for World of Warships result screens.

Input: original image bytes on stdin.
Output: one JSON object on stdout. No OCR, network calls, model downloads or writes.
This helper proposes crops only; the Node/Tesseract pipeline still validates all values.
"""
import json
import sys

try:
    import cv2
    import numpy as np
except Exception as exc:  # allow the caller to fail back to existing OCR
    sys.stderr.write(f"OpenCV unavailable: {type(exc).__name__}: {exc}\n")
    sys.exit(3)


def clamp(v, lo, hi):
    return max(lo, min(hi, int(round(v))))


def union_box(boxes):
    if not boxes:
        return None
    return [min(b[0] for b in boxes), min(b[1] for b in boxes),
            max(b[2] for b in boxes), max(b[3] for b in boxes)]


def get_components(gray, offset_x, offset_y, full_w, full_h):
    """Return compact, text-sized connected components from alternative local masks."""
    if gray.size == 0:
        return []
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    block = min(41, max(15, (min(gray.shape[:2]) // 3) | 1))
    if block % 2 == 0:
        block += 1
    masks = [
        cv2.adaptiveThreshold(clahe, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                              cv2.THRESH_BINARY, block, 5),
        cv2.adaptiveThreshold(clahe, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                              cv2.THRESH_BINARY_INV, block, 5),
    ]
    _, otsu = cv2.threshold(clahe, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    masks.extend([otsu, cv2.bitwise_not(otsu)])
    min_h = max(3, int(full_h * 0.004))
    max_h = max(min_h + 1, int(full_h * 0.095))
    min_area = max(4, int(full_w * full_h / (1920 * 1080) * 3))
    join_w = max(1, min(7, int(full_w * 0.0016)))
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (join_w, 1))
    found = {}
    for mask in masks:
        joined = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        count, _, stats, _ = cv2.connectedComponentsWithStats(joined, 8)
        for i in range(1, count):
            x, y, w, h, area = [int(n) for n in stats[i]]
            if h < min_h or h > max_h or w < 1 or w > int(full_w * 0.36) or area < min_area:
                continue
            if area / max(1, w * h) < 0.04:
                continue
            # Component coordinates are global screenshot coordinates.
            box = (x + offset_x, y + offset_y, x + w + offset_x, y + h + offset_y)
            found[box] = max(found.get(box, 0), area)
    return [(box, area) for box, area in found.items()]


def line_groups(components, full_w, full_h):
    if not components:
        return []
    # Prefer a compact set of plausible glyph components and group by baselines.
    ordered = sorted(components, key=lambda item: ((item[0][1] + item[0][3]) / 2, item[0][0]))
    groups = []
    for box, area in ordered:
        cy = (box[1] + box[3]) / 2
        h = box[3] - box[1]
        chosen = None
        for group in groups:
            gy = (group['box'][1] + group['box'][3]) / 2
            gh = group['box'][3] - group['box'][1]
            if abs(cy - gy) <= max(full_h * 0.010, min(h, gh) * 0.75):
                chosen = group
                break
        if chosen is None:
            groups.append({'box': list(box), 'areas': [area], 'components': 1})
        else:
            chosen['box'] = [min(chosen['box'][0], box[0]), min(chosen['box'][1], box[1]),
                             max(chosen['box'][2], box[2]), max(chosen['box'][3], box[3])]
            chosen['areas'].append(area)
            chosen['components'] += 1
    out = []
    for group in groups:
        x0, y0, x1, y1 = group['box']
        width, height = x1 - x0, y1 - y0
        if width <= 0 or height <= 0:
            continue
        out.append({
            'box': group['box'], 'components': group['components'],
            'area': int(sum(group['areas'])), 'width': width, 'height': height,
            'center_x': (x0 + x1) / 2 / full_w,
            'center_y': (y0 + y1) / 2 / full_h,
            'width_fraction': width / full_w, 'height_fraction': height / full_h,
        })
    return out


def roi_groups(image, rect):
    h, w = image.shape[:2]
    x0, y0, x1, y1 = rect
    x0, y0, x1, y1 = clamp(x0, 0, w - 1), clamp(y0, 0, h - 1), clamp(x1, 1, w), clamp(y1, 1, h)
    if x1 <= x0 or y1 <= y0:
        return []
    gray = cv2.cvtColor(image[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY)
    return line_groups(get_components(gray, x0, y0, w, h), w, h)


def expanded_rect(box, w, h, pad_x, pad_y, clamp_rect=None, min_width=0.0, min_height=0.0):
    x0, y0, x1, y1 = box
    left = x0 - w * pad_x
    top = y0 - h * pad_y
    right = x1 + w * pad_x
    bottom = y1 + h * pad_y
    if right - left < w * min_width:
        mid = (left + right) / 2
        left, right = mid - w * min_width / 2, mid + w * min_width / 2
    if bottom - top < h * min_height:
        mid = (top + bottom) / 2
        top, bottom = mid - h * min_height / 2, mid + h * min_height / 2
    if clamp_rect:
        left = max(left, clamp_rect[0]); top = max(top, clamp_rect[1])
        right = min(right, clamp_rect[2]); bottom = min(bottom, clamp_rect[3])
    left, top, right, bottom = clamp(left, 0, w - 1), clamp(top, 0, h - 1), clamp(right, 1, w), clamp(bottom, 1, h)
    if right <= left or bottom <= top:
        return None
    return {'left': left, 'top': top, 'width': right - left, 'height': bottom - top}


def analyze(image):
    h, w = image.shape[:2]
    if w < 320 or h < 240:
        return {'schemaVersion': 1, 'status': 'unsupported-dimensions', 'width': w, 'height': h,
                'opencvVersion': cv2.__version__, 'regions': {}, 'preprocessing': ['BGR to grayscale', 'CLAHE', 'adaptive and Otsu threshold', 'horizontal morphological close']}

    seeds = {
        'result': (0.025, 0.12, 0.48, 0.255),
        'identity': (0.02, 0.205, 0.58, 0.315),
        'metadata': (0.54, 0.115, 0.99, 0.275),
        'rewardBand': (0.055, 0.255, 0.57, 0.405),
        'damage': (0.025, 0.365, 0.275, 0.505),
    }
    regions = {}
    component_counts = {}
    for name, nrect in seeds.items():
        seed = (int(nrect[0] * w), int(nrect[1] * h), int(nrect[2] * w), int(nrect[3] * h))
        groups = roi_groups(image, seed)
        component_counts[name] = sum(g['components'] for g in groups)
        if name == 'result':
            choices = [g for g in groups if 0.125 <= g['center_y'] <= 0.255 and g['center_x'] <= 0.48 and g['width_fraction'] >= 0.025]
            choices.sort(key=lambda g: (abs(g['center_y'] - 0.19), -g['width_fraction'], -g['components']))
            chosen = choices[:2]
            box = union_box([g['box'] for g in chosen]) if chosen else None
            if box:
                regions[name] = {'rect': expanded_rect(box, w, h, 0.012, 0.010, seed, min_width=0.12, min_height=0.035),
                                 'score': round(min(1.0, sum(g['components'] for g in chosen) / 28), 3),
                                 'componentCount': sum(g['components'] for g in chosen), 'method': 'opencv-connected-component-lines'}
        elif name == 'identity':
            choices = [g for g in groups if 0.205 <= g['center_y'] <= 0.315 and g['center_x'] <= 0.58 and g['width_fraction'] >= 0.025]
            choices.sort(key=lambda g: (abs(g['center_y'] - 0.255), -g['width_fraction'], -g['components']))
            if choices:
                g = choices[0]
                regions[name] = {'rect': expanded_rect(g['box'], w, h, 0.012, 0.012, seed, min_width=0.16, min_height=0.030),
                                 'score': round(min(1.0, g['components'] / 20), 3),
                                 'componentCount': g['components'], 'method': 'opencv-connected-component-line'}
        elif name == 'metadata':
            choices = [g for g in groups if 0.13 <= g['center_y'] <= 0.265 and g['center_x'] >= 0.54 and g['width_fraction'] >= 0.018]
            choices.sort(key=lambda g: (g['center_y'], -g['components']))
            chosen = choices[:3]
            box = union_box([g['box'] for g in chosen]) if chosen else None
            if box:
                regions[name] = {'rect': expanded_rect(box, w, h, 0.014, 0.010, seed, min_width=0.16, min_height=0.045),
                                 'score': round(min(1.0, sum(g['components'] for g in chosen) / 18), 3),
                                 'componentCount': sum(g['components'] for g in chosen), 'method': 'opencv-connected-component-lines'}
        elif name == 'rewardBand':
            choices = [g for g in groups if 0.275 <= g['center_y'] <= 0.40 and 0.05 <= g['center_x'] <= 0.57 and g['width_fraction'] >= 0.02]
            # This crop is an anchor/evidence source only, never a direct accepted tuple.
            chosen = sorted(choices, key=lambda g: (abs(g['center_y'] - 0.345), -g['components']))[:5]
            box = union_box([g['box'] for g in chosen]) if chosen else None
            if box:
                regions[name] = {'rect': expanded_rect(box, w, h, 0.010, 0.014, seed, min_width=0.26, min_height=0.045),
                                 'score': round(min(1.0, sum(g['components'] for g in chosen) / 24), 3),
                                 'componentCount': sum(g['components'] for g in chosen), 'method': 'opencv-connected-component-row'}
        elif name == 'damage':
            choices = [g for g in groups if 0.375 <= g['center_y'] <= 0.50 and 0.025 <= g['center_x'] <= 0.24 and 0.025 <= g['width_fraction'] <= 0.18 and g['height_fraction'] >= 0.012]
            choices.sort(key=lambda g: (abs(g['center_y'] - 0.445), g['center_x'], -g['components']))
            if choices:
                g = choices[0]
                rect = expanded_rect(g['box'], w, h, 0.006, 0.012, seed, min_width=0.045, min_height=0.035)
                # The crop is only marked icon-isolated when its right edge stays
                # left of the known ribbon zone and the CV component box is compact.
                isolated = bool(rect and (rect['left'] + rect['width']) <= w * 0.215 and g['width_fraction'] <= 0.14)
                regions[name] = {'rect': rect, 'score': round(min(1.0, g['components'] / 9), 3),
                                 'componentCount': g['components'], 'method': 'opencv-connected-component-number',
                                 'isolatedFromAdjacentUi': isolated}

    return {
        'schemaVersion': 1, 'status': 'ok' if regions else 'no-reliable-regions',
        'width': w, 'height': h, 'opencvVersion': cv2.__version__,
        'regions': regions, 'componentCountsBySeed': component_counts,
        'preprocessing': ['BGR-to-grayscale', 'CLAHE clipLimit=2.0 tileGridSize=8x8',
                          'adaptive Gaussian threshold (binary and inverse)', 'Otsu threshold (binary and inverse)',
                          'horizontal morphological close'],
        'acceptancePolicy': 'geometry proposals only; OCR and application validation remain authoritative',
    }


def main():
    payload = sys.stdin.buffer.read()
    if not payload:
        sys.stderr.write('No image bytes received on stdin.\n')
        return 2
    raw = np.frombuffer(payload, dtype=np.uint8)
    image = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    if image is None:
        sys.stderr.write('OpenCV could not decode the supplied image.\n')
        return 4
    result = analyze(image)
    sys.stdout.write(json.dumps(result, separators=(',', ':')))
    sys.stdout.write('\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
