import fitz  # PyMuPDF

def extract_text_from_pdf(pdf_path: str) -> str | None:
    try:
        # Open the PDF document using fitz
        doc = fitz.open(pdf_path)
        
        # Join the text from all pages into a single string
        text = "".join(page.get_text() for page in doc)  # type: ignore
        
        return text
    except Exception as e:
        print(f"🛑 Error reading or extracting text from PDF {pdf_path}: {e}")
        return None