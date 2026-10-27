"""
Document and Batch Processor
Handles DOCX, PDF, TXT, and Markdown files with style and structure preservation.
Supports multi-file batch processing with ZIP bundling.
"""

import io
import os
import zipfile
from typing import List, Dict, Any, Tuple
import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import pypdf

from humanizer_engine import engine

class DocumentProcessor:
    def __init__(self):
        pass

    async def process_text_content(
        self,
        text: str,
        mode: str = "ultra_stealth",
        intensity: int = 75,
        provider: str = "local",
        api_key: str = None
    ) -> Dict[str, Any]:
        """Humanizes raw string content preserving paragraph breaks."""
        paragraphs = text.split("\n\n")
        humanized_paragraphs = []
        all_changes = []

        for p in paragraphs:
            p_strip = p.strip()
            if not p_strip:
                humanized_paragraphs.append("")
                continue
            res = await engine.humanize(
                p_strip,
                mode=mode,
                intensity=intensity,
                provider=provider,
                api_key=api_key
            )
            humanized_paragraphs.append(res["humanized_text"])
            all_changes.extend(res.get("changes_applied", []))

        final_text = "\n\n".join(humanized_paragraphs)
        return {
            "text": final_text,
            "changes": all_changes
        }

    async def process_docx(
        self,
        file_bytes: bytes,
        mode: str = "ultra_stealth",
        intensity: int = 75,
        provider: str = "local",
        api_key: str = None
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Processes a .docx file: extracts paragraphs, humanizes text,
        and constructs a new cleanly styled .docx file.
        """
        in_stream = io.BytesIO(file_bytes)
        source_doc = docx.Document(in_stream)
        out_doc = docx.Document()

        original_full_text = []
        humanized_full_text = []
        total_changes = []

        for para in source_doc.paragraphs:
            text = para.text.strip()
            if not text:
                out_doc.add_paragraph()
                continue

            original_full_text.append(text)

            # Check if this paragraph is a heading
            style_name = para.style.name if para.style else "Normal"
            is_heading = "heading" in style_name.lower() or "title" in style_name.lower()

            if is_heading:
                # For headings, apply minimal light polish without aggressive restructuring
                res = await engine.humanize(text, mode="academic", intensity=40, provider="local")
                humanized_text = res["humanized_text"]
                out_para = out_doc.add_heading(humanized_text, level=1 if "1" in style_name else 2)
            else:
                res = await engine.humanize(
                    text,
                    mode=mode,
                    intensity=intensity,
                    provider=provider,
                    api_key=api_key
                )
                humanized_text = res["humanized_text"]
                total_changes.extend(res.get("changes_applied", []))
                out_para = out_doc.add_paragraph(humanized_text)

            humanized_full_text.append(humanized_text)

        # Also handle tables if present
        for table in source_doc.tables:
            out_table = out_doc.add_table(rows=len(table.rows), cols=len(table.columns))
            out_table.style = 'Table Grid'
            for r_idx, row in enumerate(table.rows):
                for c_idx, cell in enumerate(row.cells):
                    cell_text = cell.text.strip()
                    if cell_text:
                        res = await engine.humanize(cell_text, mode="academic", intensity=50, provider="local")
                        out_table.cell(r_idx, c_idx).text = res["humanized_text"]

        out_stream = io.BytesIO()
        out_doc.save(out_stream)
        out_bytes = out_stream.getvalue()

        orig_str = "\n\n".join(original_full_text)
        human_str = "\n\n".join(humanized_full_text)

        metrics = {
            "original_length": len(orig_str),
            "humanized_length": len(human_str),
            "original_words": len(orig_str.split()),
            "humanized_words": len(human_str.split()),
            "changes_count": len(total_changes),
            "sample_changes": total_changes[:10]
        }

        return out_bytes, metrics

    async def process_pdf(
        self,
        file_bytes: bytes,
        mode: str = "ultra_stealth",
        intensity: int = 75,
        provider: str = "local",
        api_key: str = None
    ) -> Tuple[bytes, bytes, Dict[str, Any]]:
        """
        Extracts text from PDF, humanizes it, and outputs both a .docx and .txt.
        """
        in_stream = io.BytesIO(file_bytes)
        reader = pypdf.PdfReader(in_stream)
        extracted_text = []

        for page in reader.pages:
            t = page.extract_text()
            if t:
                extracted_text.append(t)

        raw_text = "\n\n".join(extracted_text)
        proc_res = await self.process_text_content(
            raw_text, mode=mode, intensity=intensity, provider=provider, api_key=api_key
        )
        humanized_text = proc_res["text"]

        # Build DOCX
        doc = docx.Document()
        for p in humanized_text.split("\n\n"):
            if p.strip():
                doc.add_paragraph(p.strip())

        docx_stream = io.BytesIO()
        doc.save(docx_stream)
        docx_bytes = docx_stream.getvalue()
        txt_bytes = humanized_text.encode("utf-8")

        metrics = {
            "page_count": len(reader.pages),
            "original_words": len(raw_text.split()),
            "humanized_words": len(humanized_text.split()),
            "changes_count": len(proc_res["changes"])
        }

        return docx_bytes, txt_bytes, metrics

    async def process_batch(
        self,
        files: List[Tuple[str, bytes]],
        mode: str = "ultra_stealth",
        intensity: int = 75,
        provider: str = "local",
        api_key: str = None
    ) -> Tuple[bytes, List[Dict[str, Any]]]:
        """
        Processes a batch of files and creates a ZIP archive containing all
        humanized documents (.docx).
        """
        zip_stream = io.BytesIO()
        file_reports = []

        with zipfile.ZipFile(zip_stream, "w", zipfile.ZIP_DEFLATED) as zf:
            for filename, file_content in files:
                ext = os.path.splitext(filename)[1].lower()
                clean_name = os.path.splitext(filename)[0]
                out_name = f"{clean_name}_humanized.docx"

                try:
                    if ext in [".docx", ".doc"]:
                        out_bytes, meta = await self.process_docx(
                            file_content, mode=mode, intensity=intensity, provider=provider, api_key=api_key
                        )
                        zf.writestr(out_name, out_bytes)
                        file_reports.append({
                            "filename": filename,
                            "output_name": out_name,
                            "status": "success",
                            "words": meta.get("humanized_words", 0),
                            "changes": meta.get("changes_count", 0)
                        })

                    elif ext == ".pdf":
                        docx_bytes, _, meta = await self.process_pdf(
                            file_content, mode=mode, intensity=intensity, provider=provider, api_key=api_key
                        )
                        zf.writestr(out_name, docx_bytes)
                        file_reports.append({
                            "filename": filename,
                            "output_name": out_name,
                            "status": "success",
                            "words": meta.get("humanized_words", 0),
                            "changes": meta.get("changes_count", 0)
                        })

                    elif ext in [".txt", ".md"]:
                        text = file_content.decode("utf-8", errors="ignore")
                        proc = await self.process_text_content(
                            text, mode=mode, intensity=intensity, provider=provider, api_key=api_key
                        )
                        # Save both txt and docx
                        txt_out_name = f"{clean_name}_humanized{ext}"
                        zf.writestr(txt_out_name, proc["text"].encode("utf-8"))
                        
                        # Also build docx
                        doc = docx.Document()
                        for p in proc["text"].split("\n\n"):
                            if p.strip():
                                doc.add_paragraph(p.strip())
                        d_stream = io.BytesIO()
                        doc.save(d_stream)
                        zf.writestr(out_name, d_stream.getvalue())

                        file_reports.append({
                            "filename": filename,
                            "output_name": out_name,
                            "status": "success",
                            "words": len(proc["text"].split()),
                            "changes": len(proc.get("changes", []))
                        })

                    else:
                        file_reports.append({
                            "filename": filename,
                            "status": "skipped",
                            "error": f"Unsupported format: {ext}"
                        })

                except Exception as e:
                    file_reports.append({
                        "filename": filename,
                        "status": "error",
                        "error": str(e)
                    })

        return zip_stream.getvalue(), file_reports

# Singleton instance
doc_processor = DocumentProcessor()
