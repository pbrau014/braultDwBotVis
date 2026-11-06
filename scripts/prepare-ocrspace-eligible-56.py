#!/usr/bin/env python3
"""Reassemble and verify the user-approved 56-image OCR.Space source archive."""
from __future__ import annotations
import hashlib, json, os, shutil, sys, zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
PARTS = [ROOT / "testdata" / f"imgsHalf1-eligible-56.zip.{n:03d}" for n in (1, 2, 3)]
MANIFEST = ROOT / "dwbotStuff" / "DWBOT_64_IMAGE_INVENTORY_REVIEWED.json"
ARCHIVE = Path(os.environ.get("OCRSPACE_56_ARCHIVE_PATH", Path(os.environ.get("RUNNER_TEMP", ROOT / "tmp")) / "imgsHalf1-eligible-56.zip")).resolve()
IMAGE_ROOT = Path(os.environ.get("OCRSPACE_56_IMAGE_ROOT", Path(os.environ.get("RUNNER_TEMP", ROOT / "tmp")) / "imgsHalf1-eligible-56")).resolve()
REPORT = Path(os.environ.get("OCRSPACE_56_PREFLIGHT_REPORT", Path(os.environ.get("RUNNER_TEMP", ROOT / "tmp")) / "imgsHalf1-eligible-56-preflight.json")).resolve()

def digest_file(path: Path) -> tuple[int, str]:
    h = hashlib.sha256(); size = 0
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            size += len(block); h.update(block)
    return size, h.hexdigest()

def main() -> None:
    for p in PARTS:
        if not p.is_file(): raise RuntimeError(f"Missing split archive part: {p.relative_to(ROOT)}")
    ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
    with ARCHIVE.open("wb") as out:
        for p in PARTS:
            with p.open("rb") as src: shutil.copyfileobj(src, out, 1024 * 1024)
    archive_bytes, archive_sha = digest_file(ARCHIVE)
    inventory = json.loads(MANIFEST.read_text(encoding="utf-8"))
    eligible = [r for r in inventory["records"] if r.get("corpusDisposition") == "eligible_user_verified_visible_fields"]
    excluded = [r for r in inventory["records"] if r.get("corpusDisposition") == "exclude_user_verified"]
    if len(inventory.get("records", [])) != 64 or len(eligible) != 56 or len(excluded) != 8:
        raise RuntimeError("Reviewed inventory is not exactly 56 eligible plus 8 excluded records.")
    expected = {r["filename"]: r for r in eligible}
    if len(expected) != 56: raise RuntimeError("Eligible manifest filenames are not unique.")
    IMAGE_ROOT.mkdir(parents=True, exist_ok=True)
    for child in IMAGE_ROOT.iterdir():
        if child.is_dir(): shutil.rmtree(child)
        else: child.unlink()
    verified = []
    with zipfile.ZipFile(ARCHIVE, "r") as z:
        infos = z.infolist()
        names = [i.filename for i in infos]
        if len(names) != 56 or len(set(names)) != 56:
            raise RuntimeError(f"ZIP must contain exactly 56 unique entries; found {len(names)} entries.")
        if set(names) != set(expected):
            missing = sorted(set(expected) - set(names)); extra = sorted(set(names) - set(expected))
            raise RuntimeError(f"ZIP member set mismatch; missing={missing}; unexpected={extra}")
        for info in infos:
            name = info.filename
            posix = PurePosixPath(name)
            if posix.is_absolute() or len(posix.parts) != 1 or name in ("", ".", "..") or "\\" in name or info.is_dir():
                raise RuntimeError(f"Unsafe or non-file ZIP entry rejected: {name!r}")
            unix_mode = (info.external_attr >> 16) & 0xFFFF
            if unix_mode and (unix_mode & 0o170000) == 0o120000:
                raise RuntimeError(f"Symlink ZIP entry rejected: {name}")
            record = expected[name]
            target = IMAGE_ROOT / name
            h = hashlib.sha256(); size = 0
            with z.open(info, "r") as src, target.open("xb") as dst:
                for block in iter(lambda: src.read(1024 * 1024), b""):
                    size += len(block); h.update(block); dst.write(block)
            actual = h.hexdigest()
            if size != int(record["bytes"]) or actual != str(record["sha256"]).lower():
                raise RuntimeError(f"Image fingerprint mismatch for {name}: {size}/{actual}")
            verified.append({"filename": name, "bytes": size, "sha256": actual})
    if len(verified) != 56: raise RuntimeError("Not all 56 eligible source images were verified.")
    if any((IMAGE_ROOT / r["filename"]).exists() for r in excluded):
        raise RuntimeError("A user-excluded image unexpectedly exists in the extraction root.")
    report = {
        "schemaVersion": 1, "status": "verified-eligible-only-56",
        "sourceType": "repository-split-zip-parts-concatenated",
        "archivePath": str(ARCHIVE), "archiveBytes": archive_bytes, "archiveSha256": archive_sha,
        "splitParts": [{"path": str(p.relative_to(ROOT)), "bytes": p.stat().st_size, "sha256": digest_file(p)[1]} for p in PARTS],
        "inventorySha256": hashlib.sha256(MANIFEST.read_bytes()).hexdigest(),
        "inventoryEntries": 64, "archiveMembers": 56, "eligibleMembersVerified": 56,
        "excludedRecords": 8, "excludedRecordsAbsent": True, "verifiedMembers": verified,
        "providerRequestsPermitted": True,
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")\n    _, report_sha = digest_file(REPORT)\n    REPORT.with_suffix(REPORT.suffix + ".sha256").write_text(f"{report_sha}  {REPORT.name}\\n", encoding="ascii")
    envfile = os.environ.get("GITHUB_ENV")
    if envfile:
        with open(envfile, "a", encoding="utf-8") as f:
            f.write(f"OCRSPACE_64_ARCHIVE_PATH={ARCHIVE}\n")
            f.write(f"OCRSPACE_64_IMAGE_ROOT={IMAGE_ROOT}\n")
            f.write(f"OCRSPACE_56_ARCHIVE_SHA256={archive_sha}\n")
            f.write(f"OCRSPACE_56_PREFLIGHT_REPORT={REPORT}\n")
    print(json.dumps({k: report[k] for k in ("status", "archiveBytes", "archiveSha256", "archiveMembers", "eligibleMembersVerified", "excludedRecordsAbsent", "providerRequestsPermitted")}, indent=2))

if __name__ == "__main__":
    try: main()
    except Exception as exc:
        print(f"[OCRSPACE-56-PREFLIGHT] BLOCKED: {exc}", file=sys.stderr)
        sys.exit(1)
