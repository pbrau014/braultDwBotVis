#!/usr/bin/env python3
"""Download-independent integrity gate for the 63-image exploratory corpus."""
from __future__ import annotations
import hashlib, json, os, shutil, sys, zipfile
from pathlib import Path, PurePosixPath

EXPECTED_ARCHIVE_SHA256 = "6294944fbad9df05feeeac57b68acaf12642f8c883697748cad3b1a88f8bcba3"
EXPECTED_ARCHIVE_BYTES = 25862132
EXPECTED_MANIFEST_SHA256 = "c84f590e61ef835c9b53cf6baceb3f1937cf88b06cb9aafaf0472c65f796ffc6"
ARCHIVE = Path(os.environ.get("OCRSPACE_63_ARCHIVE_PATH", Path(os.environ.get("RUNNER_TEMP", ".")) / "DWBOT_IMAGESF_HOLDOUT_CANDIDATE_63.zip")).resolve()
IMAGE_ROOT = Path(os.environ.get("OCRSPACE_63_IMAGE_ROOT", Path(os.environ.get("RUNNER_TEMP", ".")) / "dwbot-imagesF-63")).resolve()
REPORT = Path(os.environ.get("OCRSPACE_63_PREFLIGHT_REPORT", Path(os.environ.get("RUNNER_TEMP", ".")) / "dwbot-imagesF-63-preflight.json")).resolve()

def digest_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def digest_file(path: Path) -> tuple[int, str]:
    h = hashlib.sha256()
    size = 0
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            size += len(block)
            h.update(block)
    return size, h.hexdigest()

def main() -> None:
    if not ARCHIVE.is_file():
        raise RuntimeError(f"Downloaded archive is missing: {ARCHIVE}")
    archive_bytes, archive_sha = digest_file(ARCHIVE)
    if archive_bytes != EXPECTED_ARCHIVE_BYTES or archive_sha != EXPECTED_ARCHIVE_SHA256:
        raise RuntimeError(f"Archive fingerprint mismatch: {archive_bytes}/{archive_sha}")
    if IMAGE_ROOT.exists():
        shutil.rmtree(IMAGE_ROOT)
    IMAGE_ROOT.mkdir(parents=True)
    with zipfile.ZipFile(ARCHIVE, "r") as archive:
        infos = archive.infolist()
        if len(infos) != 64 or any(info.is_dir() for info in infos):
            raise RuntimeError(f"Expected exactly 64 file members (63 images + manifest), found {len(infos)} entries")
        names = [info.filename for info in infos]
        if len(set(names)) != 64:
            raise RuntimeError("Duplicate ZIP member names detected")
        manifest_names = [name for name in names if PurePosixPath(name).name == "DWBOT_IMAGESF_HOLDOUT_CANDIDATE_MANIFEST.json"]
        if len(manifest_names) != 1:
            raise RuntimeError(f"Expected one embedded full manifest, found {len(manifest_names)}")
        manifest_name = manifest_names[0]
        manifest_path = PurePosixPath(manifest_name)
        if manifest_path.is_absolute() or len(manifest_path.parts) != 1 or "\\\\" in manifest_name:
            raise RuntimeError(f"Unsafe manifest path: {manifest_name!r}")
        manifest_bytes = archive.read(manifest_name)
        manifest_sha = digest_bytes(manifest_bytes)
        if manifest_sha != EXPECTED_MANIFEST_SHA256:
            raise RuntimeError(f"Embedded manifest SHA-256 mismatch: {manifest_sha}")
        manifest = json.loads(manifest_bytes.decode("utf-8"))
        records = manifest.get("records")
        if not isinstance(records, list) or len(records) != 63:
            raise RuntimeError("Embedded manifest must contain exactly 63 image records")
        expected = {}
        for record in records:
            name = record.get("filename")
            if not isinstance(name, str) or not name or name in expected:
                raise RuntimeError(f"Invalid or duplicate manifest filename: {name!r}")
            p = PurePosixPath(name)
            if p.is_absolute() or len(p.parts) != 1 or name in (".", "..") or "\\\\" in name:
                raise RuntimeError(f"Unsafe manifest member path: {name!r}")
            if p.suffix.lower() not in (".jpg", ".jpeg", ".png", ".bmp"):
                raise RuntimeError(f"Unsupported image extension: {name}")
            expected[name] = record
        image_names = [name for name in names if name != manifest_name]
        if set(image_names) != set(expected) or len(image_names) != 63:
            raise RuntimeError(f"Archive member set mismatch; missing={sorted(set(expected)-set(image_names))}; extra={sorted(set(image_names)-set(expected))}")
        verified = []
        for name in sorted(image_names):
            info = next(item for item in infos if item.filename == name)
            record = expected[name]
            expected_size = int(record["bytes"])
            if info.file_size != expected_size:
                raise RuntimeError(f"ZIP size metadata mismatch for {name}")
            unix_mode = (info.external_attr >> 16) & 0xFFFF
            if unix_mode and (unix_mode & 0o170000) == 0o120000:
                raise RuntimeError(f"Symlink ZIP member rejected: {name}")
            target = IMAGE_ROOT / name
            h = hashlib.sha256()
            size = 0
            with archive.open(info, "r") as source, target.open("xb") as output:
                for block in iter(lambda: source.read(1024 * 1024), b""):
                    size += len(block)
                    if size > expected_size:
                        raise RuntimeError(f"Member exceeds manifest size: {name}")
                    h.update(block)
                    output.write(block)
            actual = h.hexdigest()
            if size != expected_size or actual != str(record["sha256"]).lower():
                raise RuntimeError(f"Member fingerprint mismatch for {name}: {size}/{actual}")
            verified.append({"filename": name, "bytes": size, "sha256": actual})
    report = {
        "schemaVersion": 1,
        "status": "verified-imagesF-63-exploratory",
        "providerRequestsPermitted": True,
        "archiveFilename": ARCHIVE.name,
        "archiveBytes": archive_bytes,
        "archiveSha256": archive_sha,
        "manifestFilename": "DWBOT_IMAGESF_HOLDOUT_CANDIDATE_MANIFEST.json",
        "manifestSha256": manifest_sha,
        "archiveMemberCount": 64,
        "imageMemberCount": len(verified),
        "allImageMemberHashesVerified": len(verified) == 63,
        "verifiedMembers": verified,
        "groundTruthStatus": "NOT_EVALUABLE_NO_INDEPENDENT_GROUND_TRUTH",
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    (REPORT.parent / "DWBOT_IMAGESF_HOLDOUT_CANDIDATE_MANIFEST.json").write_bytes(manifest_bytes)
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_sha = digest_file(REPORT)[1]
    REPORT.with_suffix(REPORT.suffix + ".sha256").write_text(f"{report_sha}  {REPORT.name}\n", encoding="ascii")
    envfile = os.environ.get("GITHUB_ENV")
    if envfile:
        with open(envfile, "a", encoding="utf-8") as stream:
            stream.write(f"OCRSPACE_63_IMAGE_ROOT={IMAGE_ROOT}\n")
            stream.write(f"OCRSPACE_63_PREFLIGHT_REPORT={REPORT}\n")
            stream.write(f"OCRSPACE_63_ARCHIVE_SHA256={archive_sha}\n")
    print(json.dumps({key: report[key] for key in ("status", "archiveBytes", "archiveSha256", "archiveMemberCount", "imageMemberCount", "allImageMemberHashesVerified", "providerRequestsPermitted")}, indent=2))

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"[OCRSPACE-63-PREFLIGHT] BLOCKED: {error}", file=sys.stderr)
        sys.exit(1)
