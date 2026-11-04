from __future__ import annotations

import asyncio
import hashlib
import hmac
import html
import json
import logging
import math
import os
import queue
import re
import secrets
import shutil
import tempfile
import threading
import time
import uuid
from collections import defaultdict
from contextlib import contextmanager
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from statistics import median
from typing import Any, Callable, Iterable, Iterator, Mapping, Optional, Sequence

import cv2
import numpy as np
import pypdfium2 as pdfium
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, Response
from PIL import Image, ImageSequence, UnidentifiedImageError
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from rapidfuzz import fuzz, process
from rapidfuzz.distance import Levenshtein
from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    select,
)
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import PlainTextResponse

try:
    from pydantic import BaseModel, Field
except ImportError as exc:  # pragma: no cover - dependency is mandatory in deployed runtime
    raise RuntimeError("Pydantic is required. Install the project's requirements.txt.") from exc


LOGGER = logging.getLogger("enterprise_ocr")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))
MAX_REQUEST_BODY_BYTES = MAX_UPLOAD_BYTES + 512 * 1024
MAX_IMAGE_PIXELS = int(os.getenv("MAX_IMAGE_PIXELS", "50000000"))
MAX_PDF_PAGES = int(os.getenv("MAX_PDF_PAGES", "500"))
TARGET_LONG_SIDE = int(os.getenv("OCR_TARGET_LONG_SIDE", "2480"))
OCR_PROFILE_DEFAULT = os.getenv("OCR_PROFILE_DEFAULT", "document")
UPLOAD_ROOT = Path(os.getenv("UPLOAD_DIR", "./uploads")).resolve()
DATA_ROOT = Path(os.getenv("DATA_DIR", "./data")).resolve()
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
DATA_ROOT.mkdir(parents=True, exist_ok=True)
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


# Metrics are derived from actual pipeline operations. Ground-truth accuracy is only
# updated by labeled evaluation; ordinary unlabelled production OCR does not invent CER.
JOBS_TOTAL = Counter("ocr_pipeline_jobs_total", "OCR jobs observed", ["status"])
FAILURES_TOTAL = Counter("ocr_pipeline_failures_total", "OCR job failures", ["stage"])
PAGES_TOTAL = Counter("ocr_pipeline_pages_total", "Pages processed", ["profile"])
BLOCKS_TOTAL = Counter("ocr_pipeline_text_blocks_total", "Text blocks recognized", ["engine"])
REVIEW_ITEMS_TOTAL = Counter("ocr_pipeline_review_items_total", "Items sent for human review")
PAGE_LATENCY = Histogram(
    "ocr_pipeline_page_processing_seconds",
    "Page processing duration in seconds",
    buckets=(0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 30, 60, 120, 300),
)
INFERENCE_LATENCY = Histogram(
    "ocr_pipeline_inference_seconds",
    "Model inference duration in seconds",
    ["engine"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60),
)
LABELED_CER = Gauge(
    "ocr_pipeline_labeled_cer",
    "Character error rate on a labeled evaluation batch; absent until measured",
)
READY = Gauge("ocr_pipeline_ready", "1 when API dependencies are ready")


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", f"sqlite:///{(DATA_ROOT / 'ocr.sqlite3').as_posix()}")
    db_pool_size: int = int(os.getenv("DB_POOL_SIZE", "3"))
    db_max_overflow: int = int(os.getenv("DB_MAX_OVERFLOW", "2"))
    db_pool_timeout: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    paddle_detection_model_dir: Optional[str] = os.getenv("PADDLE_DET_MODEL_DIR")
    paddle_recognition_model_dir: Optional[str] = os.getenv("PADDLE_REC_MODEL_DIR")
    paddle_device: str = os.getenv("PADDLE_DEVICE", "cpu")
    paddle_model_pool_size: int = int(os.getenv("PADDLE_MODEL_POOL_SIZE", "1"))
    model_checkout_timeout: float = float(os.getenv("MODEL_CHECKOUT_TIMEOUT", "120"))
    allow_model_download: bool = os.getenv("PADDLE_ALLOW_MODEL_DOWNLOAD", "false").lower() == "true"
    enable_tesseract_comparison: bool = os.getenv("ENABLE_TESSERACT_COMPARISON", "false").lower() == "true"
    review_token: str = os.getenv("REVIEW_TOKEN", "")
    webhook_enabled: bool = os.getenv("WEBHOOK_ENABLED", "false").lower() == "true"
    webhook_secret: str = os.getenv("WEBHOOK_SECRET", "")
    webhook_allowlist: tuple[str, ...] = tuple(
        item.strip().lower() for item in os.getenv("WEBHOOK_ALLOWLIST", "").split(",") if item.strip()
    )
    webhook_max_attempts: int = int(os.getenv("WEBHOOK_MAX_ATTEMPTS", "5"))


SETTINGS = Settings()


def build_database_engine(database_url: str = SETTINGS.database_url):
    """Create a bounded sync SQLAlchemy engine; pool sizing is per process."""
    common = {"pool_pre_ping": True, "future": True}
    if database_url.startswith("sqlite:"):
        return create_engine(database_url, connect_args={"check_same_thread": False}, **common)
    return create_engine(
        database_url,
        pool_size=SETTINGS.db_pool_size,
        max_overflow=SETTINGS.db_max_overflow,
        pool_timeout=SETTINGS.db_pool_timeout,
        pool_recycle=1800,
        **common,
    )


ENGINE = build_database_engine()
SessionLocal = sessionmaker(bind=ENGINE, autoflush=False, expire_on_commit=False, class_=Session)


class Base(DeclarativeBase):
    pass


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    source_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    profile: Mapped[str] = mapped_column(String(40), nullable=False, default="document")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="queued", index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )
    pages: Mapped[list["PageRecord"]] = relationship(back_populates="document", cascade="all, delete-orphan")


class PageRecord(Base):
    __tablename__ = "document_pages"
    __table_args__ = (UniqueConstraint("document_id", "page_index", name="uq_document_page"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    page_index: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    recognized_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    profile: Mapped[str] = mapped_column(String(40), nullable=False)
    layout_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    table_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    processing_seconds: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    document: Mapped[Document] = relationship(back_populates="pages")
    candidates: Mapped[list["OCRCandidate"]] = relationship(back_populates="page", cascade="all, delete-orphan")


class OCRCandidate(Base):
    __tablename__ = "ocr_candidates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    page_id: Mapped[str] = mapped_column(ForeignKey("document_pages.id", ondelete="CASCADE"), nullable=False, index=True)
    block_index: Mapped[int] = mapped_column(Integer, nullable=False)
    engine: Mapped[str] = mapped_column(String(40), nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    polygon: Mapped[Optional[list[list[float]]]] = mapped_column(JSON, nullable=True)
    bbox: Mapped[Optional[list[float]]] = mapped_column(JSON, nullable=True)
    correction_suggestion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    correction_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reviewed_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    review_status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    page: Mapped[PageRecord] = relationship(back_populates="candidates")


class WebhookOutbox(Base):
    __tablename__ = "webhook_outbox"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    destination: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


Index("ix_candidate_review_status", OCRCandidate.review_status)


def initialize_database() -> None:
    Base.metadata.create_all(bind=ENGINE)


def db_session() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@dataclass
class OCRBlock:
    index: int
    text: str
    confidence: Optional[float]
    polygon: list[list[float]]
    bbox: tuple[float, float, float, float]
    engine: str = "paddleocr"
    correction_suggestion: Optional[str] = None
    correction_score: Optional[float] = None

    def to_dict(self) -> dict[str, Any]:
        value = asdict(self)
        value["bbox"] = list(self.bbox)
        return value


@dataclass
class TableCell:
    row: int
    column: int
    text: str
    bbox: list[float]
    source_block_indices: list[int]


@dataclass
class TableMatrix:
    extraction_method: str
    bbox: list[float]
    rows: list[list[str]]
    cells: list[TableCell]
    confidence_note: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "extraction_method": self.extraction_method,
            "bbox": self.bbox,
            "rows": self.rows,
            "cells": [asdict(cell) for cell in self.cells],
            "confidence_note": self.confidence_note,
        }


class PayloadValidationError(ValueError):
    pass


class TransientProcessingError(RuntimeError):
    pass


class BodyLimitExceeded(Exception):
    pass


class RequestBodyLimitMiddleware(BaseHTTPMiddleware):
    """Reject oversized multipart bodies before FastAPI parses and spools them."""

    async def dispatch(self, request: Request, call_next):
        if request.url.path == "/v1/documents" and request.method.upper() == "POST":
            header = request.headers.get("content-length")
            if header:
                try:
                    if int(header) > MAX_REQUEST_BODY_BYTES:
                        return JSONResponse(status_code=413, content={"detail": "Request body exceeds configured limit."})
                except ValueError:
                    return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header."})
            receive = request.receive
            total = 0

            async def limited_receive():
                nonlocal total
                message = await receive()
                if message.get("type") == "http.request":
                    total += len(message.get("body", b""))
                    if total > MAX_REQUEST_BODY_BYTES:
                        raise BodyLimitExceeded
                return message

            request._receive = limited_receive
            try:
                return await call_next(request)
            except BodyLimitExceeded:
                return JSONResponse(status_code=413, content={"detail": "Request body exceeds configured limit."})
        return await call_next(request)


def _file_signature(path: Path) -> str:
    with path.open("rb") as handle:
        signature = handle.read(16)
    if signature.startswith(b"%PDF-"):
        return "application/pdf"
    try:
        with Image.open(path) as image:
            image.verify()
            fmt = (image.format or "").upper()
            mime = Image.MIME.get(fmt)
            if mime in {"image/jpeg", "image/png", "image/tiff", "image/webp", "image/bmp"}:
                return mime
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        pass
    raise PayloadValidationError("Unsupported, empty, corrupt, or unrecognized file content.")


async def stage_upload(upload: UploadFile, destination_root: Path = UPLOAD_ROOT) -> tuple[Path, int, str, str]:
    """Stream an UploadFile to disk, enforcing 25 MiB and calculating SHA-256."""
    destination_root.mkdir(parents=True, exist_ok=True)
    document_id = str(uuid.uuid4())
    suffix = Path(upload.filename or "upload.bin").suffix.lower()
    if suffix not in {".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp", ".bmp"}:
        suffix = ".bin"
    final_path = destination_root / f"{document_id}{suffix}"
    partial_path = destination_root / f".{document_id}.uploading"
    size = 0
    digest = hashlib.sha256()
    try:
        with partial_path.open("xb") as handle:
            while True:
                chunk = await upload.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise PayloadValidationError(f"Upload exceeds the {MAX_UPLOAD_BYTES}-byte file limit.")
                digest.update(chunk)
                handle.write(chunk)
            handle.flush()
            os.fsync(handle.fileno())
        if size <= 0:
            raise PayloadValidationError("Uploaded file is empty.")
        mime_type = _file_signature(partial_path)
        os.replace(partial_path, final_path)
        return final_path, size, digest.hexdigest(), mime_type
    except Exception:
        partial_path.unlink(missing_ok=True)
        final_path.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()


def validate_staged_file(path: Path, size_bytes: Optional[int] = None) -> str:
    if not path.is_file():
        raise FileNotFoundError(f"Staged input does not exist: {path}")
    actual_size = path.stat().st_size
    if actual_size <= 0:
        raise PayloadValidationError("Input file is empty.")
    if actual_size > MAX_UPLOAD_BYTES:
        raise PayloadValidationError("Input exceeds the configured 25 MiB limit.")
    if size_bytes is not None and actual_size != size_bytes:
        raise PayloadValidationError("Staged file size does not match the recorded upload size.")
    return _file_signature(path)


def stream_pdf_pages_safely(path: str | Path, *, max_pages: int = MAX_PDF_PAGES, target_long_side: int = TARGET_LONG_SIDE) -> Iterator[tuple[int, np.ndarray]]:
    """Render a PDF one page at a time from a disk-backed file; never materialize all pages."""
    pdf = pdfium.PdfDocument(str(path))
    try:
        page_count = len(pdf)
        if page_count <= 0:
            raise PayloadValidationError("PDF contains no pages.")
        if page_count > max_pages:
            raise PayloadValidationError(f"PDF page count {page_count} exceeds the configured limit {max_pages}.")
        for page_index in range(page_count):
            page = pdf[page_index]
            bitmap = None
            try:
                width_pt, height_pt = page.get_size()
                scale = min(4.0, max(1.0, target_long_side / max(width_pt, height_pt)))
                bitmap = page.render(scale=scale, rotation=0)
                pil_image = bitmap.to_pil().convert("RGB")
                width, height = pil_image.size
                if width * height > MAX_IMAGE_PIXELS:
                    raise PayloadValidationError(f"Rendered PDF page {page_index + 1} exceeds the pixel limit.")
                rgb = np.asarray(pil_image)
                yield page_index, cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
            finally:
                if bitmap is not None and hasattr(bitmap, "close"):
                    bitmap.close()
                page.close()
    finally:
        pdf.close()


def stream_raster_pages_safely(path: str | Path, *, max_pages: int = MAX_PDF_PAGES) -> Iterator[tuple[int, np.ndarray]]:
    """Yield still-image or multi-frame TIFF pages without retaining earlier pages."""
    with Image.open(path) as image:
        frame_count = int(getattr(image, "n_frames", 1))
        if frame_count > max_pages:
            raise PayloadValidationError(f"Image frame count {frame_count} exceeds the configured limit {max_pages}.")
        for page_index in range(frame_count):
            image.seek(page_index)
            frame = image.convert("RGB")
            width, height = frame.size
            if width * height > MAX_IMAGE_PIXELS:
                raise PayloadValidationError(f"Image page {page_index + 1} exceeds the pixel limit.")
            rgb = np.asarray(frame)
            yield page_index, cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def iter_document_pages(path: str | Path) -> Iterator[tuple[int, np.ndarray]]:
    mime_type = validate_staged_file(Path(path))
    if mime_type == "application/pdf":
        yield from stream_pdf_pages_safely(path)
    else:
        yield from stream_raster_pages_safely(path)


def _as_bgr(image: np.ndarray) -> np.ndarray:
    if not isinstance(image, np.ndarray) or image.size == 0:
        raise ValueError("Image must be a non-empty NumPy array.")
    if image.ndim == 2:
        return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    if image.ndim != 3 or image.shape[2] not in (3, 4):
        raise ValueError("Image must be grayscale, BGR, or BGRA.")
    if image.shape[2] == 4:
        return cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
    return image.copy()


def remove_illumination_shadows(image: np.ndarray) -> np.ndarray:
    """Conservative document-only background normalization; original pixels remain persisted separately."""
    bgr = _as_bgr(image)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    kernel_size = max(15, (min(gray.shape[:2]) // 20) | 1)
    if kernel_size % 2 == 0:
        kernel_size += 1
    background = cv2.medianBlur(gray, kernel_size)
    background = np.maximum(background, 8)
    normalized = cv2.divide(gray, background, scale=255)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(normalized)
    return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)


def _estimate_skew_angle(gray: np.ndarray) -> Optional[float]:
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    threshold = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
    coords = np.column_stack(np.where(threshold > 0))
    if len(coords) < 30:
        return None
    if len(coords) > 500_000:
        coords = coords[:: max(1, len(coords) // 500_000)]
    angle = float(cv2.minAreaRect(coords.astype(np.float32))[-1])
    angle = -(90.0 + angle) if angle < -45.0 else -angle
    if not math.isfinite(angle) or abs(angle) < 0.25 or abs(angle) > 12.0:
        return None
    return angle


def normalize_and_deskew(
    image: np.ndarray,
    *,
    profile: str = "document",
    target_long_side: int = TARGET_LONG_SIDE,
    deskew: Optional[bool] = None,
) -> tuple[np.ndarray, dict[str, Any]]:
    """Scale without forced A4 conversion; game screenshots avoid document-only transforms."""
    if profile not in {"document", "wows"}:
        raise ValueError("profile must be 'document' or 'wows'.")
    bgr = _as_bgr(image)
    original_height, original_width = bgr.shape[:2]
    if original_width * original_height > MAX_IMAGE_PIXELS:
        raise PayloadValidationError("Image exceeds configured pixel limit.")
    scale = min(1.0, target_long_side / float(max(original_width, original_height)))
    if scale < 1.0:
        new_size = (max(1, round(original_width * scale)), max(1, round(original_height * scale)))
        bgr = cv2.resize(bgr, new_size, interpolation=cv2.INTER_AREA)
    metadata: dict[str, Any] = {
        "original_width": int(original_width),
        "original_height": int(original_height),
        "processed_width": int(bgr.shape[1]),
        "processed_height": int(bgr.shape[0]),
        "scale_factor": float(scale),
        "deskew_degrees": 0.0,
        "profile": profile,
    }
    if profile == "document":
        bgr = remove_illumination_shadows(bgr)
        should_deskew = True if deskew is None else deskew
        if should_deskew:
            gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
            angle = _estimate_skew_angle(gray)
            if angle is not None:
                height, width = bgr.shape[:2]
                matrix = cv2.getRotationMatrix2D((width / 2.0, height / 2.0), angle, 1.0)
                bgr = cv2.warpAffine(
                    bgr,
                    matrix,
                    (width, height),
                    flags=cv2.INTER_CUBIC,
                    borderMode=cv2.BORDER_REPLICATE,
                )
                metadata["deskew_degrees"] = angle
    return bgr, metadata


def create_preprocessing_variants(image: np.ndarray, profile: str = "document") -> dict[str, np.ndarray]:
    """Return bounded variants for evaluation; no variant overwrites the original input."""
    bgr = _as_bgr(image)
    variants = {"normalized": bgr}
    if profile == "document":
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        variants["grayscale"] = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        variants["adaptive_threshold"] = cv2.cvtColor(
            cv2.adaptiveThreshold(
                cv2.GaussianBlur(gray, (3, 3), 0), 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11
            ),
            cv2.COLOR_GRAY2BGR,
        )
    elif profile == "wows":
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8)).apply(gray)
        variants["local_contrast"] = cv2.cvtColor(clahe, cv2.COLOR_GRAY2BGR)
    else:
        raise ValueError("Unknown preprocessing profile.")
    return variants


def _result_payload(result: Any) -> Mapping[str, Any]:
    payload = getattr(result, "json", None)
    if callable(payload):
        payload = payload()
    if payload is None and isinstance(result, Mapping):
        payload = result
    if payload is None:
        raise ValueError("OCR engine returned an unsupported result object.")
    if isinstance(payload, Mapping) and isinstance(payload.get("res"), Mapping):
        payload = payload["res"]
    if not isinstance(payload, Mapping):
        raise ValueError("OCR result payload is not a mapping.")
    return payload


def _polygon_bbox(polygon: Sequence[Sequence[float]]) -> tuple[float, float, float, float]:
    points = np.asarray(polygon, dtype=np.float32).reshape(-1, 2)
    return (
        float(np.min(points[:, 0])),
        float(np.min(points[:, 1])),
        float(np.max(points[:, 0])),
        float(np.max(points[:, 1])),
    )


def parse_paddle_results(result_list: Sequence[Any]) -> list[OCRBlock]:
    blocks: list[OCRBlock] = []
    for result in result_list or []:
        payload = _result_payload(result)
        texts = list(payload.get("rec_texts") or [])
        scores = list(payload.get("rec_scores") or [])
        polygons = list(payload.get("rec_polys") or payload.get("dt_polys") or [])
        boxes = list(payload.get("rec_boxes") or [])
        for index, text_value in enumerate(texts):
            text_value = str(text_value).strip()
            if not text_value:
                continue
            polygon: list[list[float]] = []
            bbox: tuple[float, float, float, float]
            if index < len(polygons):
                polygon = np.asarray(polygons[index], dtype=float).reshape(-1, 2).tolist()
                bbox = _polygon_bbox(polygon)
            elif index < len(boxes):
                x1, y1, x2, y2 = [float(v) for v in np.asarray(boxes[index]).reshape(-1)[:4]]
                bbox = (x1, y1, x2, y2)
                polygon = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]
            else:
                bbox = (0.0, float(index), 1.0, float(index + 1))
            score = float(scores[index]) if index < len(scores) else None
            if score is not None and not math.isfinite(score):
                score = None
            blocks.append(OCRBlock(index=len(blocks), text=text_value, confidence=score, polygon=polygon, bbox=bbox))
    return blocks


def suggest_text_normalization(text_value: str, vocabulary: Sequence[str], *, score_cutoff: int = 88) -> tuple[Optional[str], Optional[float]]:
    """Suggest only; never mutate OCR evidence or silently rewrite names/numbers."""
    token = text_value.strip()
    if not token or not vocabulary:
        return None, None
    if len(token.split()) != 1 or any(char.isdigit() for char in token):
        return None, None
    match = process.extractOne(token.upper(), list(vocabulary), scorer=fuzz.ratio, score_cutoff=score_cutoff)
    if match is None:
        return None, None
    suggestion, score, _ = match
    if suggestion == token.upper():
        return None, None
    return str(suggestion), float(score)


def parse_regex_entities(text_dump: str) -> dict[str, list[str]]:
    patterns = {
        "invoice_id": r"(?i)(?:invoice|inv|receipt)\s*[:#\s]\s*([A-Z0-9][A-Z0-9-]+)",
        "date": r"\b(?:\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4})\b",
        "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
        "phone": r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
        "currency_amounts": r"(?:\$|USD\s*)\s*\d+(?:,\d{3})*(?:\.\d{2})?",
    }
    return {key: list(dict.fromkeys(re.findall(pattern, text_dump))) for key, pattern in patterns.items()}


def _group_rows(blocks: Sequence[OCRBlock], y_tolerance: Optional[float] = None) -> list[list[OCRBlock]]:
    if not blocks:
        return []
    heights = [max(1.0, block.bbox[3] - block.bbox[1]) for block in blocks]
    tolerance = y_tolerance if y_tolerance is not None else max(4.0, median(heights) * 0.55)
    ordered = sorted(blocks, key=lambda item: ((item.bbox[1] + item.bbox[3]) / 2.0, item.bbox[0]))
    rows: list[list[OCRBlock]] = []
    row_centers: list[float] = []
    for block in ordered:
        center_y = (block.bbox[1] + block.bbox[3]) / 2.0
        choices = [(abs(center_y - center), index) for index, center in enumerate(row_centers)]
        if choices and min(choices)[0] <= tolerance:
            _, row_index = min(choices)
            rows[row_index].append(block)
            row_centers[row_index] = sum((item.bbox[1] + item.bbox[3]) / 2.0 for item in rows[row_index]) / len(rows[row_index])
        else:
            rows.append([block])
            row_centers.append(center_y)
    row_pairs = sorted(zip(row_centers, rows), key=lambda pair: pair[0])
    return [sorted(row, key=lambda item: item.bbox[0]) for _, row in row_pairs]


def reconstruct_reading_order(blocks: Sequence[OCRBlock], image_width: int) -> list[dict[str, Any]]:
    """Order wide spanning headings first, then columns left-to-right and top-to-bottom."""
    if not blocks:
        return []
    widths = [max(1.0, item.bbox[2] - item.bbox[0]) for item in blocks]
    span_threshold = max(image_width * 0.72, median(widths) * 4.0)
    spanning = [item for item in blocks if item.bbox[2] - item.bbox[0] >= span_threshold]
    ordinary = [item for item in blocks if item not in spanning]
    heights = [max(1.0, item.bbox[3] - item.bbox[1]) for item in ordinary] or [12.0]
    column_gap = max(18.0, median(heights) * 2.2)
    intervals = sorted(ordinary, key=lambda item: item.bbox[0])
    columns: list[dict[str, Any]] = []
    for item in intervals:
        placed = False
        for column in columns:
            if item.bbox[0] <= column["right"] + column_gap:
                column["items"].append(item)
                column["right"] = max(column["right"], item.bbox[2])
                column["left"] = min(column["left"], item.bbox[0])
                placed = True
                break
        if not placed:
            columns.append({"left": item.bbox[0], "right": item.bbox[2], "items": [item]})
    columns.sort(key=lambda column: column["left"])
    ordered: list[OCRBlock] = sorted(spanning, key=lambda item: (item.bbox[1], item.bbox[0]))
    for column in columns:
        ordered.extend(item for row in _group_rows(column["items"]) for item in row)
    return [
        {
            "reading_order": order,
            "text": item.text,
            "confidence": item.confidence,
            "engine": item.engine,
            "bbox": list(item.bbox),
            "polygon": item.polygon,
            "correction_suggestion": item.correction_suggestion,
            "correction_score": item.correction_score,
        }
        for order, item in enumerate(ordered, start=1)
    ]


def _table_from_rows(
    rows: Sequence[Sequence[OCRBlock]], bbox: Sequence[float], method: str, confidence_note: str
) -> TableMatrix:
    matrix: list[list[str]] = []
    cells: list[TableCell] = []
    for row_index, row in enumerate(rows):
        values: list[str] = []
        for column_index, item in enumerate(sorted(row, key=lambda block: block.bbox[0])):
            values.append(item.text)
            cells.append(
                TableCell(
                    row=row_index,
                    column=column_index,
                    text=item.text,
                    bbox=list(item.bbox),
                    source_block_indices=[item.index],
                )
            )
        matrix.append(values)
    return TableMatrix(method, list(map(float, bbox)), matrix, cells, confidence_note)


def _morphological_table_boxes(image: np.ndarray) -> list[tuple[int, int, int, int]]:
    bgr = _as_bgr(image)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 31, 10)
    height, width = gray.shape[:2]
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(15, width // 35), 1))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(15, height // 35)))
    horizontal = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel)
    vertical = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel)
    grid = cv2.add(horizontal, vertical)
    contours, _ = cv2.findContours(grid, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes: list[tuple[int, int, int, int]] = []
    for contour in contours:
        x, y, box_width, box_height = cv2.boundingRect(contour)
        if box_width >= max(80, width * 0.12) and box_height >= max(45, height * 0.06):
            boxes.append((x, y, x + box_width, y + box_height))
    boxes.sort(key=lambda item: (item[1], item[0]))
    return boxes


def _projection_profile_fallback(blocks: Sequence[OCRBlock]) -> Optional[TableMatrix]:
    """Cluster row/column word coordinates when no continuous table rules exist."""
    if len(blocks) < 4:
        return None
    rows = _group_rows(blocks)
    if len(rows) < 2 or max(map(len, rows)) < 2:
        return None
    block_heights = [max(1.0, item.bbox[3] - item.bbox[1]) for item in blocks]
    x_tolerance = max(12.0, median(block_heights) * 1.7)
    starts = sorted((item.bbox[0], item) for item in blocks)
    column_clusters: list[list[OCRBlock]] = []
    cluster_centers: list[float] = []
    for x_start, item in starts:
        options = [(abs(x_start - center), index) for index, center in enumerate(cluster_centers)]
        if options and min(options)[0] <= x_tolerance:
            _, index = min(options)
            column_clusters[index].append(item)
            cluster_centers[index] = sum(block.bbox[0] for block in column_clusters[index]) / len(column_clusters[index])
        else:
            column_clusters.append([item])
            cluster_centers.append(x_start)
    useful = [index for index, column in enumerate(column_clusters) if len(column) >= 2]
    if len(useful) < 2:
        return None
    order = sorted(useful, key=lambda index: cluster_centers[index])
    selected_columns = [column_clusters[index] for index in order]
    row_groups = _group_rows(blocks)
    matrix: list[list[str]] = []
    cells: list[TableCell] = []
    for row_index, row in enumerate(row_groups):
        values: list[str] = []
        used: set[int] = set()
        for column_index, column in enumerate(selected_columns):
            center = cluster_centers[order[column_index]]
            candidates = [item for item in row if item not in used]
            if not candidates:
                values.append("")
                continue
            nearest = min(candidates, key=lambda item: abs(item.bbox[0] - center))
            if abs(nearest.bbox[0] - center) <= x_tolerance:
                used.add(id(nearest))
                values.append(nearest.text)
                cells.append(
                    TableCell(row_index, column_index, nearest.text, list(nearest.bbox), [nearest.index])
                )
            else:
                values.append("")
        if any(values):
            matrix.append(values)
    if len(matrix) < 2:
        return None
    x1 = min(item.bbox[0] for item in blocks)
    y1 = min(item.bbox[1] for item in blocks)
    x2 = max(item.bbox[2] for item in blocks)
    y2 = max(item.bbox[3] for item in blocks)
    return TableMatrix(
        "spatial_projection_profile",
        [x1, y1, x2, y2],
        matrix,
        cells,
        "Candidate borderless-table structure inferred from repeated OCR word-coordinate alignment; review before export.",
    )


def extract_table_matrices(image: np.ndarray, blocks: Sequence[OCRBlock]) -> list[TableMatrix]:
    """Prefer visible-rule morphology, then use coordinate projection as a fallback."""
    if not blocks:
        return []
    matrices: list[TableMatrix] = []
    for x1, y1, x2, y2 in _morphological_table_boxes(image):
        contained = [
            item for item in blocks
            if x1 <= (item.bbox[0] + item.bbox[2]) / 2.0 <= x2
            and y1 <= (item.bbox[1] + item.bbox[3]) / 2.0 <= y2
        ]
        grouped = _group_rows(contained)
        if len(grouped) >= 2 and max(map(len, grouped)) >= 2:
            matrices.append(
                _table_from_rows(
                    grouped,
                    (x1, y1, x2, y2),
                    "morphological_grid",
                    "Visible horizontal/vertical rules identified the candidate table bounds; cell text remains OCR-derived.",
                )
            )
    if matrices:
        return matrices
    fallback = _projection_profile_fallback(blocks)
    return [fallback] if fallback else []


def character_error_rate(reference: str, hypothesis: str) -> float:
    if not reference and not hypothesis:
        return 0.0
    if not reference:
        return math.inf
    return Levenshtein.distance(reference, hypothesis) / float(len(reference))


def word_error_rate(reference: str, hypothesis: str) -> float:
    reference_words = reference.split()
    hypothesis_words = hypothesis.split()
    if not reference_words and not hypothesis_words:
        return 0.0
    if not reference_words:
        return math.inf
    return Levenshtein.distance(reference_words, hypothesis_words) / float(len(reference_words))


class PaddleEngineFactory:
    def __call__(self):
        try:
            from paddleocr import PaddleOCR
        except ImportError as exc:
            raise RuntimeError("PaddleOCR is not installed in this environment.") from exc
        det_dir = SETTINGS.paddle_detection_model_dir
        rec_dir = SETTINGS.paddle_recognition_model_dir
        if not SETTINGS.allow_model_download:
            if not det_dir or not rec_dir:
                raise RuntimeError(
                    "Local-first mode requires PADDLE_DET_MODEL_DIR and PADDLE_REC_MODEL_DIR. "
                    "Place verified PaddleOCR inference models on the local models volume; automatic downloads are disabled."
                )
            if not Path(det_dir).is_dir() or not Path(rec_dir).is_dir():
                raise RuntimeError("Configured local PaddleOCR detection/recognition model directories do not exist.")
        kwargs: dict[str, Any] = {
            "use_doc_orientation_classify": False,
            "use_doc_unwarping": False,
            "use_textline_orientation": False,
            "device": SETTINGS.paddle_device,
        }
        if det_dir:
            kwargs["text_detection_model_dir"] = det_dir
        if rec_dir:
            kwargs["text_recognition_model_dir"] = rec_dir
        return PaddleOCR(**kwargs)


class ThreadSafeModelPool:
    """Bounded queue of private engine instances; default pool size is one model per process."""

    def __init__(
        self,
        model_factory: Optional[Callable[[], Any]] = None,
        *,
        pool_size: Optional[int] = None,
        checkout_timeout: Optional[float] = None,
    ):
        self.model_factory = model_factory or PaddleEngineFactory()
        self.pool_size = max(1, int(pool_size or SETTINGS.paddle_model_pool_size))
        self.checkout_timeout = float(checkout_timeout or SETTINGS.model_checkout_timeout)
        self._queue: queue.Queue[Any] = queue.Queue(maxsize=self.pool_size)
        self._init_lock = threading.Lock()
        self._initialized = False
        self._closed = False

    def _ensure_initialized(self) -> None:
        if self._initialized:
            return
        with self._init_lock:
            if self._initialized:
                return
            if self._closed:
                raise RuntimeError("Model pool has been closed.")
            models: list[Any] = []
            try:
                for _ in range(self.pool_size):
                    models.append(self.model_factory())
                for model in models:
                    self._queue.put_nowait(model)
                self._initialized = True
            except Exception:
                for model in models:
                    close = getattr(model, "close", None)
                    if callable(close):
                        try:
                            close()
                        except Exception:
                            LOGGER.exception("Model cleanup failed after pool initialization error.")
                raise

    @contextmanager
    def checkout(self):
        self._ensure_initialized()
        try:
            model = self._queue.get(timeout=self.checkout_timeout)
        except queue.Empty as exc:
            raise TimeoutError("Timed out waiting for an OCR model slot.") from exc
        try:
            yield model
        finally:
            if not self._closed:
                self._queue.put(model)

    def predict(self, image: np.ndarray) -> list[OCRBlock]:
        start = time.perf_counter()
        with self.checkout() as model:
            result = model.predict(image)
        INFERENCE_LATENCY.labels(engine="paddleocr").observe(time.perf_counter() - start)
        blocks = parse_paddle_results(result)
        BLOCKS_TOTAL.labels(engine="paddleocr").inc(len(blocks))
        return blocks

    async def predict_async(self, image: np.ndarray) -> list[OCRBlock]:
        return await asyncio.to_thread(self.predict, image)

    def close(self) -> None:
        self._closed = True
        if self._initialized:
            while True:
                try:
                    model = self._queue.get_nowait()
                except queue.Empty:
                    break
                close = getattr(model, "close", None)
                if callable(close):
                    close()


class TesseractBaseline:
    """Optional local Tesseract CLI comparator; it does not replace a separate Tesseract.js bot baseline."""

    def predict(self, image: np.ndarray) -> list[OCRBlock]:
        try:
            import pytesseract
            from pytesseract import Output
        except ImportError as exc:
            raise RuntimeError("pytesseract is unavailable; install the optional baseline dependency.") from exc
        started = time.perf_counter()
        data = pytesseract.image_to_data(image, output_type=Output.DICT, config="--psm 6")
        INFERENCE_LATENCY.labels(engine="tesseract_cli").observe(time.perf_counter() - started)
        blocks: list[OCRBlock] = []
        for index, raw_text in enumerate(data.get("text", [])):
            text_value = str(raw_text).strip()
            if not text_value:
                continue
            try:
                confidence = float(data["conf"][index]) / 100.0
            except (ValueError, TypeError, KeyError):
                confidence = None
            x = float(data["left"][index])
            y = float(data["top"][index])
            width = float(data["width"][index])
            height = float(data["height"][index])
            bbox = (x, y, x + width, y + height)
            polygon = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]]
            blocks.append(OCRBlock(len(blocks), text_value, confidence, polygon, bbox, engine="tesseract_cli"))
        BLOCKS_TOTAL.labels(engine="tesseract_cli").inc(len(blocks))
        return blocks


class OCRPipeline:
    def __init__(self, model_pool: Optional[ThreadSafeModelPool] = None, session_factory: Any = SessionLocal):
        self.model_pool = model_pool or ThreadSafeModelPool()
        self.session_factory = session_factory
        self.vocabulary = [
            "INVOICE", "RECEIPT", "DATE", "TOTAL", "TOTAL DUE", "BALANCE", "SUBTOTAL",
            "DESCRIPTION", "QUANTITY", "PRICE", "AMOUNT", "TAX", "VENDOR", "CUSTOMER", "SHIP TO",
        ]
        self.tesseract = TesseractBaseline() if SETTINGS.enable_tesseract_comparison else None

    def process_page(self, image: np.ndarray, page_index: int, profile: str) -> dict[str, Any]:
        started = time.perf_counter()
        normalized, normalization = normalize_and_deskew(image, profile=profile)
        paddle_blocks = self.model_pool.predict(normalized)
        for block in paddle_blocks:
            suggestion, score = suggest_text_normalization(block.text, self.vocabulary)
            block.correction_suggestion = suggestion
            block.correction_score = score
        layout = reconstruct_reading_order(paddle_blocks, normalized.shape[1])
        tables = extract_table_matrices(normalized, paddle_blocks)
        entities = parse_regex_entities("\n".join(block.text for block in paddle_blocks))
        alternative_candidates: list[dict[str, Any]] = []
        if self.tesseract is not None:
            try:
                alternative_candidates = [block.to_dict() for block in self.tesseract.predict(normalized)]
            except Exception:
                LOGGER.exception("Optional Tesseract comparison failed; PaddleOCR evidence is retained.")
        duration = time.perf_counter() - started
        PAGE_LATENCY.observe(duration)
        PAGES_TOTAL.labels(profile=profile).inc()
        low_confidence_count = sum(1 for item in paddle_blocks if item.confidence is not None and item.confidence < 0.75)
        if low_confidence_count:
            REVIEW_ITEMS_TOTAL.inc(low_confidence_count)
        return {
            "page_index": page_index,
            "width": int(normalized.shape[1]),
            "height": int(normalized.shape[0]),
            "normalization": normalization,
            "recognized_text": "\n".join(block.text for block in paddle_blocks),
            "layout": layout,
            "tables": [table.to_dict() for table in tables],
            "entities": entities,
            "candidates": [block.to_dict() for block in paddle_blocks],
            "alternative_candidates": alternative_candidates,
            "processing_seconds": duration,
        }

    def _persist_page(self, document_id: str, profile: str, page_result: dict[str, Any]) -> None:
        if self.session_factory is None:
            return
        with self.session_factory.begin() as session:
            document = session.get(Document, document_id)
            if document is None:
                raise LookupError(f"Document {document_id} does not exist.")
            existing = session.scalar(
                select(PageRecord).where(
                    PageRecord.document_id == document_id,
                    PageRecord.page_index == page_result["page_index"],
                )
            )
            if existing is not None:
                session.delete(existing)
                session.flush()
            page = PageRecord(
                id=str(uuid.uuid4()),
                document_id=document_id,
                page_index=page_result["page_index"],
                width=page_result["width"],
                height=page_result["height"],
                recognized_text=page_result["recognized_text"],
                profile=profile,
                layout_json=page_result["layout"],
                table_json=page_result["tables"],
                processing_seconds=page_result["processing_seconds"],
            )
            session.add(page)
            session.flush()
            for candidate in page_result["candidates"] + page_result["alternative_candidates"]:
                session.add(
                    OCRCandidate(
                        id=str(uuid.uuid4()),
                        page_id=page.id,
                        block_index=int(candidate["index"]),
                        engine=str(candidate["engine"]),
                        raw_text=str(candidate["text"]),
                        confidence=candidate.get("confidence"),
                        polygon=candidate.get("polygon"),
                        bbox=candidate.get("bbox"),
                        correction_suggestion=candidate.get("correction_suggestion"),
                        correction_score=candidate.get("correction_score"),
                    )
                )

    def run_document(self, document_id: str, source_path: str | Path, profile: str = "document") -> dict[str, Any]:
        source = Path(source_path).resolve()
        mime_type = validate_staged_file(source)
        if profile not in {"document", "wows"}:
            raise ValueError("Unsupported processing profile.")
        if self.session_factory is not None:
            with self.session_factory.begin() as session:
                document = session.get(Document, document_id)
                if document is None:
                    raise LookupError(f"Document {document_id} does not exist.")
                document.status = "processing"
                document.error_message = None
        page_count = 0
        try:
            for page_index, image in iter_document_pages(source):
                page_result = self.process_page(image, page_index, profile)
                self._persist_page(document_id, profile, page_result)
                page_count += 1
            with self.session_factory.begin() as session:
                document = session.get(Document, document_id)
                if document is not None:
                    document.status = "completed"
                    document.error_message = None
            JOBS_TOTAL.labels(status="completed").inc()
            return {"document_id": document_id, "status": "completed", "pages_processed": page_count, "mime_type": mime_type}
        except Exception as exc:
            FAILURES_TOTAL.labels(stage="document_processing").inc()
            if self.session_factory is not None:
                with self.session_factory.begin() as session:
                    document = session.get(Document, document_id)
                    if document is not None:
                        document.status = "failed"
                        document.error_message = f"{type(exc).__name__}: {str(exc)[:1000]}"
            JOBS_TOTAL.labels(status="failed").inc()
            raise


def sign_webhook_body(secret: str, timestamp: str, body: bytes) -> str:
    message = timestamp.encode("utf-8") + b"." + body
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def validate_webhook_destination(destination: str) -> str:
    from urllib.parse import urlparse
    parsed = urlparse(destination)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("Webhook destinations must use HTTPS and have a hostname.")
    if parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError("Webhook URL credentials and non-standard ports are not permitted.")
    if parsed.hostname.lower() not in SETTINGS.webhook_allowlist:
        raise ValueError("Webhook hostname is not present in WEBHOOK_ALLOWLIST.")
    return destination


def enqueue_webhook_event(session: Session, event_type: str, payload: dict[str, Any], destination: str) -> str:
    if not SETTINGS.webhook_enabled or not SETTINGS.webhook_secret or not SETTINGS.webhook_allowlist:
        raise RuntimeError("Outbound webhooks are disabled or not fully configured.")
    destination = validate_webhook_destination(destination)
    event_id = str(uuid.uuid4())
    session.add(
        WebhookOutbox(
            id=event_id,
            event_type=event_type,
            payload_json=payload,
            destination=destination,
            status="pending",
            attempts=0,
            next_attempt_at=datetime.now(timezone.utc),
        )
    )
    return event_id


def dispatch_webhook_outbox(batch_size: int = 20) -> int:
    """Dispatch due outbox messages; caller schedules retries, never fire-and-forget."""
    if not SETTINGS.webhook_enabled:
        return 0
    import httpx
    delivered = 0
    now = datetime.now(timezone.utc)
    with SessionLocal.begin() as session:
        due = list(
            session.scalars(
                select(WebhookOutbox)
                .where(WebhookOutbox.status == "pending", WebhookOutbox.next_attempt_at <= now)
                .order_by(WebhookOutbox.created_at)
                .limit(batch_size)
            )
        )
        item_ids = [item.id for item in due]
    for item_id in item_ids:
        with SessionLocal() as session:
            item = session.get(WebhookOutbox, item_id)
            if item is None or item.status != "pending":
                continue
            try:
                destination = validate_webhook_destination(item.destination)
                body = json.dumps(
                    {"id": item.id, "event": item.event_type, "payload": item.payload_json},
                    separators=(",", ":"),
                    ensure_ascii=False,
                ).encode("utf-8")
                timestamp = str(int(time.time()))
                signature = sign_webhook_body(SETTINGS.webhook_secret, timestamp, body)
                response = httpx.post(
                    destination,
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-OCR-Event-ID": item.id,
                        "X-OCR-Timestamp": timestamp,
                        "X-OCR-Signature": f"sha256={signature}",
                    },
                    timeout=10.0,
                    follow_redirects=False,
                )
                response.raise_for_status()
                item.status = "delivered"
                item.last_error = None
                delivered += 1
            except Exception as exc:
                item.attempts += 1
                item.last_error = f"{type(exc).__name__}: {str(exc)[:500]}"
                if item.attempts >= SETTINGS.webhook_max_attempts:
                    item.status = "failed"
                else:
                    delay = min(600, 2 ** item.attempts) + secrets.randbelow(4)
                    item.next_attempt_at = datetime.now(timezone.utc).replace(microsecond=0) + __import__("datetime").timedelta(seconds=delay)
            session.commit()
    return delivered


class ReviewRequest(BaseModel):
    reviewed_text: str = Field(min_length=0, max_length=10000)
    decision: str = Field(pattern="^(approved|rejected)$")


class DocumentResponse(BaseModel):
    document_id: str
    status: str
    sha256: str
    size_bytes: int
    profile: str
    message: str


app = FastAPI(title="Computer-Vision OCR and Document Intelligence Pipeline", version="1.0.0")
app.add_middleware(RequestBodyLimitMiddleware)


@app.on_event("startup")
def startup_event() -> None:
    initialize_database()
    READY.set(1)


@app.on_event("shutdown")
def shutdown_event() -> None:
    READY.set(0)


@app.get("/health/live")
def health_live() -> dict[str, str]:
    return {"status": "live"}


@app.get("/health/ready")
def health_ready() -> JSONResponse:
    try:
        with ENGINE.connect() as connection:
            connection.exec_driver_sql("SELECT 1")
        return JSONResponse(status_code=200, content={"status": "ready", "database": "reachable"})
    except Exception as exc:
        READY.set(0)
        return JSONResponse(status_code=503, content={"status": "not_ready", "reason": type(exc).__name__})


@app.get("/metrics")
def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/v1/documents", response_model=DocumentResponse, status_code=202)
async def create_document(
    file: UploadFile = File(...),
    profile: str = Form(OCR_PROFILE_DEFAULT),
    session: Session = Depends(db_session),
):
    if profile not in {"document", "wows"}:
        raise HTTPException(status_code=422, detail="profile must be 'document' or 'wows'.")
    try:
        path, size, digest, mime_type = await stage_upload(file)
    except PayloadValidationError as exc:
        raise HTTPException(status_code=413 if "limit" in str(exc).lower() or "exceeds" in str(exc).lower() else 422, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Unable to stage upload safely.") from exc
    document_id = path.stem
    try:
        document = Document(
            id=document_id,
            source_filename=Path(file.filename or "upload").name[:255],
            mime_type=mime_type,
            sha256=digest,
            size_bytes=size,
            storage_path=str(path),
            profile=profile,
            status="queued",
        )
        session.add(document)
        session.commit()
    except Exception:
        session.rollback()
        path.unlink(missing_ok=True)
        LOGGER.exception("Database persistence failed after upload staging.")
        raise HTTPException(status_code=503, detail="Unable to register uploaded document.")
    try:
        from tasks import celery_app
        celery_app.send_task("tasks.process_document", args=[document_id])
    except Exception as exc:
        with SessionLocal.begin() as db:
            record = db.get(Document, document_id)
            if record is not None:
                record.status = "queue_failed"
                record.error_message = f"Queue submission failed: {type(exc).__name__}"
        raise HTTPException(status_code=503, detail="Document was saved but the worker queue is unavailable.") from exc
    JOBS_TOTAL.labels(status="queued").inc()
    return DocumentResponse(
        document_id=document_id,
        status="queued",
        sha256=digest,
        size_bytes=size,
        profile=profile,
        message="Document safely staged and queued for local processing.",
    )


@app.get("/v1/documents/{document_id}")
def get_document(document_id: str, session: Session = Depends(db_session)) -> dict[str, Any]:
    document = session.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    pages = list(session.scalars(select(PageRecord).where(PageRecord.document_id == document_id).order_by(PageRecord.page_index)))
    return {
        "document_id": document.id,
        "filename": document.source_filename,
        "mime_type": document.mime_type,
        "sha256": document.sha256,
        "size_bytes": document.size_bytes,
        "profile": document.profile,
        "status": document.status,
        "error_message": document.error_message,
        "pages": [
            {
                "page_id": page.id,
                "page_index": page.page_index,
                "width": page.width,
                "height": page.height,
                "recognized_text": page.recognized_text,
                "layout": page.layout_json,
                "tables": page.table_json,
            }
            for page in pages
        ],
    }


@app.get("/review", response_class=HTMLResponse)
def review_dashboard() -> str:
    return """<!doctype html>
<html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>
<title>OCR Human Review</title><style>
body{font:16px system-ui,sans-serif;max-width:1100px;margin:2rem auto;padding:0 1rem;color:#17202a}input,textarea,button{font:inherit;padding:.5rem}textarea{width:100%;min-height:5rem}article{border:1px solid #ccd1d1;border-radius:8px;padding:1rem;margin:1rem 0}.muted{color:#566573}
</style></head><body><h1>OCR Human Review</h1><p class='muted'>Enter a document ID and review token. Raw OCR candidates remain preserved; review decisions are recorded separately.</p>
<label>Document ID <input id='documentId' size='40'></label> <label>Review token <input id='token' type='password' size='30'></label> <button id='load'>Load candidates</button>
<div id='results'></div><script>
const root=document.getElementById('results');
document.getElementById('load').onclick=async()=>{root.textContent='Loading...';const id=document.getElementById('documentId').value.trim();const token=document.getElementById('token').value;try{const r=await fetch('/v1/documents/'+encodeURIComponent(id));if(!r.ok)throw new Error(await r.text());const d=await r.json();root.replaceChildren();for(const p of d.pages){for(const c of (p.layout||[])){const a=document.createElement('article');const h=document.createElement('h3');h.textContent='Page '+(p.page_index+1)+' — '+c.engine;const t=document.createElement('textarea');t.value=c.text;const b=document.createElement('button');b.textContent='Approve this text';b.onclick=async()=>{b.disabled=true;try{const q=await fetch('/v1/candidates/'+encodeURIComponent(c.candidate_id)+'/review',{method:'POST',headers:{'Content-Type':'application/json','X-Review-Token':token},body:JSON.stringify({reviewed_text:t.value,decision:'approved'})});if(!q.ok)throw new Error(await q.text());b.textContent='Saved';}catch(e){b.disabled=false;alert(e.message)}};a.append(h,t,b);root.append(a)}}}catch(e){root.textContent=e.message}};
</script></body></html>"""


@app.post("/v1/candidates/{candidate_id}/review")
def review_candidate(
    candidate_id: str,
    payload: ReviewRequest,
    x_review_token: str = Header(default=""),
    session: Session = Depends(db_session),
):
    if not SETTINGS.review_token:
        raise HTTPException(status_code=503, detail="HITL review is disabled until REVIEW_TOKEN is configured.")
    if not hmac.compare_digest(x_review_token, SETTINGS.review_token):
        raise HTTPException(status_code=401, detail="Invalid review token.")
    candidate = session.get(OCRCandidate, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="OCR candidate not found.")
    candidate.reviewed_text = payload.reviewed_text
    candidate.review_status = payload.decision
    session.commit()
    return {"candidate_id": candidate.id, "review_status": candidate.review_status, "reviewed_text": candidate.reviewed_text}


# Expose common names used by tasks, scripts, and automated tests.
normalize_resolution = normalize_and_deskew
reconstruct_layout = reconstruct_reading_order
extract_table_matrices = extract_table_matrices

