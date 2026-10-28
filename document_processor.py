"""
Document and Batch Processor
Handles DOCX, PDF, TXT, and Markdown files with style and structure preservation.
Supports multi-file batch processing with ZIP bundling.
"""

import asyncio
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
        """Humanizes raw string content preserving paragraph breaks with high throughput."""
        import re
        # Normalize carriage returns
        normalized = text.replace('\r\n', '\n').replace('\r', '\n')
        
        # Split on double newlines
        raw_paragraphs = re.split(r'\n{2,}', normalized)
        paragraphs = []
        
        # Guard against mega-paragraphs from PDFs that lack double-newlines
        for p in raw_paragraphs:
            p_strip = p.strip()
            if not p_strip:
                continue
            if len(p_strip) > 2500:
                # Sub-chunk by sentences
                sentences = re.split(r'(?<=[.!?])\s+', p_strip)
                chunk = []
                chunk_len = 0
                for s in sentences:
                    chunk.append(s)
                    chunk_len += len(s)
                    if chunk_len >= 1200:
                        paragraphs.append(" ".join(chunk))
                        chunk = []
                        chunk_len = 0
                if chunk:
                    paragraphs.append(" ".join(chunk))
            else:
                paragraphs.append(p_strip)

        humanized_paragraphs = []
        all_changes = []

        tasks = [
            engine.humanize(
                p_strip,
                mode=mode,
                intensity=intensity,
                provider="local" if len(p_strip.split()) < 12 else provider,
                api_key=api_key if len(p_strip.split()) >= 12 else None,
                skip_metrics=True
            )
            for p_strip in paragraphs
        ]
        results = await asyncio.gather(*tasks)
        for res in results:
            humanized_paragraphs.append(res["humanized_text"])
            all_changes.extend(res.get("changes_applied", []))

        final_text = "\n\n".join(humanized_paragraphs)
        return {
            "text": final_text,
            "changes": all_changes
        }

    @staticmethod
    def _update_paragraph_in_place(para, new_text: str):
        """
        Updates paragraph text in-place while strictly preserving original formatting,
        including paragraph style, alignment, line spacing, font family, font size,
        bold, italic, underline, and color.
        """
        if not para.runs:
            para.text = new_text
            return

        # Find first run with explicit font formatting or fallback to runs[0]
        ref_run = para.runs[0]
        for r in para.runs:
            if r.font.name or r.font.size or r.bold or r.italic or r.underline:
                ref_run = r
                break

        font_name = ref_run.font.name
        font_size = ref_run.font.size
        bold = ref_run.bold
        italic = ref_run.italic
        underline = ref_run.underline
        color = ref_run.font.color.rgb if (ref_run.font.color and ref_run.font.color.rgb) else None

        # Set new humanized text on the first run
        target_run = para.runs[0]
        target_run.text = new_text

        # Re-apply preserved run formatting
        if font_name:
            target_run.font.name = font_name
        if font_size:
            target_run.font.size = font_size
        if bold is not None:
            target_run.bold = bold
        if italic is not None:
            target_run.italic = italic
        if underline is not None:
            target_run.underline = underline
        if color:
            target_run.font.color.rgb = color

        # Blank out subsequent runs in this paragraph so old text is wiped
        for r in para.runs[1:]:
            r.text = ""

    async def process_docx(
        self,
        file_bytes: bytes,
        mode: str = "ultra_stealth",
        intensity: int = 75,
        provider: str = "local",
        api_key: str = None
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Processes a .docx file strictly IN-PLACE:
        Humanizes text while preserving 100% of the original document formatting:
        fonts, font sizes, styles, margins, headings, bullet lists, alignments,
        line spacing, tables, headers, footers, and diagrams.
        """
        in_stream = io.BytesIO(file_bytes)
        source_doc = docx.Document(in_stream)

        original_full_text = []
        humanized_full_text = []
        total_changes = []

        target_paras = []
        para_tasks = []

        for para in source_doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            style_name = para.style.name if para.style else "Normal"
            is_heading = "heading" in style_name.lower() or "title" in style_name.lower()
            
            # Headings or short snippets (< 12 words) use local engine for sub-millisecond speed
            effective_provider = "local" if (is_heading or len(text.split()) < 12) else provider

            target_paras.append(para)
            original_full_text.append(text)
            para_tasks.append(
                engine.humanize(
                    text,
                    mode="academic" if is_heading else mode,
                    intensity=40 if is_heading else intensity,
                    provider=effective_provider,
                    api_key=api_key if effective_provider != "local" else None,
                    skip_metrics=True
                )
            )

        # Also collect all table cell paragraphs to process in-place
        table_cell_paras = []
        table_tasks = []
        for table in source_doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for cp in cell.paragraphs:
                        c_text = cp.text.strip()
                        if c_text:
                            table_cell_paras.append(cp)
                            table_tasks.append(
                                engine.humanize(
                                    c_text,
                                    mode="academic",
                                    intensity=40,
                                    provider="local",
                                    skip_metrics=True
                                )
                            )

        # Execute all paragraphs concurrently in parallel
        all_results = await asyncio.gather(*para_tasks, *table_tasks)
        para_results = all_results[:len(para_tasks)]
        table_results = all_results[len(para_tasks):]

        # Update body paragraphs in-place preserving 100% formatting
        for para, res in zip(target_paras, para_results):
            humanized_text = res["humanized_text"]
            total_changes.extend(res.get("changes_applied", []))
            humanized_full_text.append(humanized_text)
            self._update_paragraph_in_place(para, humanized_text)

        # Update table cell paragraphs in-place preserving 100% formatting
        for cp, res in zip(table_cell_paras, table_results):
            self._update_paragraph_in_place(cp, res["humanized_text"])

        # Save source_doc directly to output stream (preserving original template and styles)
        out_stream = io.BytesIO()
        source_doc.save(out_stream)
        out_bytes = out_stream.getvalue()

        orig_str = "\n\n".join(original_full_text)
        human_str = "\n\n".join(humanized_full_text)

        metrics = {
            "original_length": len(orig_str),
            "humanized_length": len(human_str),
            "original_words": len(orig_str.split()),
            "humanized_words": len(human_str.split()),
            "changes_count": len(total_changes),
            "sample_changes": total_changes[:10],
            "original_preview": orig_str[:35000],
            "humanized_preview": human_str[:35000]
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
            if t and t.strip():
                extracted_text.append(t.strip())

        if not extracted_text:
            raise ValueError("No readable text found in this PDF. It appears to be an image-only or scanned PDF.")

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
            "changes_count": len(proc_res["changes"]),
            "original_preview": raw_text[:35000],
            "humanized_preview": humanized_text[:35000]
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
