import fitz


def extract_text_from_pdf(pdf_path: str):
    pdf_document = fitz.open(pdf_path)
    page_texts = []
    for page_num in range(pdf_document.page_count):
        page = pdf_document.load_page(page_num)
        page_texts.append(page.get_text())
    pdf_document.close()
    return page_texts
