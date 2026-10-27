"""
FastAPI Server for AI Humanizer Studio
Provides REST APIs for Text Humanization, AI Detection, Document (.docx, .pdf, .txt) processing,
and Multi-Document Batch Processing with ZIP download.
"""

import os
import uuid
import time
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import io
import httpx

import ai_detector
from humanizer_engine import engine
from document_processor import doc_processor

app = FastAPI(title="AI Humanizer Studio", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for downloads (token -> {data: bytes, filename: str, content_type: str, timestamp: float})
DOWNLOAD_STORE = {}

# Clean downloads older than 1 hour
def cleanup_downloads():
    now = time.time()
    expired = [k for k, v in DOWNLOAD_STORE.items() if now - v["timestamp"] > 3600]
    for k in expired:
        del DOWNLOAD_STORE[k]

class TextHumanizeRequest(BaseModel):
    text: str
    mode: str = "ultra_stealth"
    intensity: int = 75
    provider: str = "local"
    api_key: Optional[str] = None
    model_name: Optional[str] = None

class DetectRequest(BaseModel):
    text: str

class VerifyKeyRequest(BaseModel):
    provider: str
    api_key: Optional[str] = None
    model_name: Optional[str] = None

@app.post("/api/verify-api-key")
async def api_verify_api_key(req: VerifyKeyRequest):
    """Verifies whether an AI API Key (Gemini, Groq, Ollama) is valid and connected."""
    provider = req.provider.lower().strip()
    api_key = (req.api_key or "").strip()

    if provider == "local":
        return {
            "status": "ok",
            "provider": "local",
            "message": "Local Offline Engine is ready (100% Free & Unlimited)"
        }

    if not api_key and provider != "ollama":
        return {
            "status": "error",
            "provider": provider,
            "message": f"API Key is required for {provider.upper()}."
        }

    try:
        if provider == "gemini":
            model = req.model_name or "gemini-2.0-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}?key={api_key}"
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return {
                        "status": "ok",
                        "provider": "gemini",
                        "message": f"Google Gemini ({model}) Connected"
                    }
                else:
                    try:
                        data = resp.json()
                        err_msg = data.get("error", {}).get("message", "Invalid Gemini API Key")
                    except Exception:
                        err_msg = f"Gemini returned HTTP {resp.status_code}"
                    return {
                        "status": "error",
                        "provider": "gemini",
                        "message": err_msg
                    }

        elif provider == "groq":
            url = "https://api.groq.com/openai/v1/models"
            headers = {"Authorization": f"Bearer {api_key}"}
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    return {
                        "status": "ok",
                        "provider": "groq",
                        "message": "Groq Cloud API Connected"
                    }
                else:
                    try:
                        data = resp.json()
                        err_msg = data.get("error", {}).get("message", "Invalid Groq API Key")
                    except Exception:
                        err_msg = f"Groq returned HTTP {resp.status_code}"
                    return {
                        "status": "error",
                        "provider": "groq",
                        "message": err_msg
                    }

        elif provider == "ollama":
            url = f"{api_key or 'http://localhost:11434'}/api/tags"
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return {
                        "status": "ok",
                        "provider": "ollama",
                        "message": "Local Ollama Connected"
                    }
                else:
                    return {
                        "status": "error",
                        "provider": "ollama",
                        "message": f"Ollama returned HTTP {resp.status_code}"
                    }

        return {
            "status": "error",
            "provider": provider,
            "message": f"Unknown provider: {provider}"
        }

    except httpx.ConnectError:
        return {
            "status": "error",
            "provider": provider,
            "message": f"Cannot reach {provider.upper()} server. Check connection."
        }
    except Exception as e:
        return {
            "status": "error",
            "provider": provider,
            "message": str(e)
        }

@app.post("/api/detect")
async def api_detect(req: DetectRequest):
    """Calculates AI detection and burstiness metrics for given text."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    report = ai_detector.analyze_text(req.text)
    return report

@app.post("/api/humanize-text")
async def api_humanize_text(req: TextHumanizeRequest):
    """Humanizes a block of text and returns side-by-side comparison with AI metrics."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    
    result = await engine.humanize(
        text=req.text,
        mode=req.mode,
        intensity=req.intensity,
        provider=req.provider,
        api_key=req.api_key,
        model_name=req.model_name
    )
    return result

@app.post("/api/upload-document")
async def api_upload_document(
    file: UploadFile = File(...),
    mode: str = Form("ultra_stealth"),
    intensity: int = Form(75),
    provider: str = Form("local"),
    api_key: Optional[str] = Form(None)
):
    """Processes a single .docx, .pdf, or .txt file and returns humanized file for download."""
    cleanup_downloads()
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    content = await file.read()

    clean_base = os.path.splitext(filename)[0]

    try:
        if ext in [".docx", ".doc"]:
            out_bytes, meta = await doc_processor.process_docx(
                content, mode=mode, intensity=intensity, provider=provider, api_key=api_key
            )
            out_filename = f"{clean_base}_humanized.docx"
            content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        
        elif ext == ".pdf":
            docx_bytes, txt_bytes, meta = await doc_processor.process_pdf(
                content, mode=mode, intensity=intensity, provider=provider, api_key=api_key
            )
            out_bytes = docx_bytes
            out_filename = f"{clean_base}_humanized.docx"
            content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        elif ext in [".txt", ".md"]:
            text = content.decode("utf-8", errors="ignore")
            proc = await doc_processor.process_text_content(
                text, mode=mode, intensity=intensity, provider=provider, api_key=api_key
            )
            out_bytes = proc["text"].encode("utf-8")
            out_filename = f"{clean_base}_humanized{ext}"
            content_type = "text/plain"
            meta = {
                "original_words": len(text.split()),
                "humanized_words": len(proc["text"].split()),
                "changes_count": len(proc["changes"])
            }
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {ext}. Supported: .docx, .pdf, .txt, .md")
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

    token = str(uuid.uuid4())
    DOWNLOAD_STORE[token] = {
        "data": out_bytes,
        "filename": out_filename,
        "content_type": content_type,
        "timestamp": time.time()
    }

    return {
        "token": token,
        "filename": out_filename,
        "metadata": meta
    }

@app.post("/api/upload-batch")
async def api_upload_batch(
    files: List[UploadFile] = File(...),
    mode: str = Form("ultra_stealth"),
    intensity: int = Form(75),
    provider: str = Form("local"),
    api_key: Optional[str] = Form(None)
):
    """Processes multiple files simultaneously and bundles them into a downloadable ZIP."""
    cleanup_downloads()
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    file_payloads = []
    for f in files:
        data = await f.read()
        file_payloads.append((f.filename, data))

    zip_bytes, reports = await doc_processor.process_batch(
        file_payloads, mode=mode, intensity=intensity, provider=provider, api_key=api_key
    )

    token = str(uuid.uuid4())
    zip_name = f"humanized_documents_{int(time.time())}.zip"
    DOWNLOAD_STORE[token] = {
        "data": zip_bytes,
        "filename": zip_name,
        "content_type": "application/zip",
        "timestamp": time.time()
    }

    return {
        "token": token,
        "filename": zip_name,
        "total_files": len(files),
        "reports": reports
    }

@app.get("/api/download/{token}")
async def api_download(token: str):
    """Streams a processed file or ZIP archive to the browser."""
    item = DOWNLOAD_STORE.get(token)
    if not item:
        raise HTTPException(status_code=404, detail="File download expired or invalid.")

    stream = io.BytesIO(item["data"])
    headers = {
        "Content-Disposition": f'attachment; filename="{item["filename"]}"'
    }
    return StreamingResponse(stream, media_type=item["content_type"], headers=headers)

# Static directory mount
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if not os.path.exists(STATIC_DIR):
    try:
        os.makedirs(STATIC_DIR)
    except Exception:
        pass

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>AI Humanizer Studio is Starting Up...</h1>"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
