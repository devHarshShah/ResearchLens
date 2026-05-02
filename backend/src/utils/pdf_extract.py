from io import BytesIO

import fitz
import requests

from src.utils.image_quality import image_pass


def extract_data_from_pdf(
    pdf_path,
    start_page,
    end_page,
    extract_images=True,
    extract_text=True,
    save_images=False,
    image_save_path=None,
    online_pdf=False,
):
    extracted_data = []

    if online_pdf:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
            )
        }
        response = requests.get(pdf_path, headers=headers, allow_redirects=True)
        pdf_document = fitz.open(stream=BytesIO(response.content), filetype="pdf")
    else:
        pdf_document = fitz.open(pdf_path)

    for page_number in range(start_page - 1, min(end_page, len(pdf_document))):
        page_data = []
        if extract_text:
            page_text = pdf_document[page_number].get_text()
            page_data.append(["t", page_text])

        if extract_images:
            image_list = pdf_document[page_number].get_images(full=True)
            for image_index, img in enumerate(image_list):
                xref = img[0]
                base_image = pdf_document.extract_image(xref)
                image_bytes = base_image["image"]
                if image_pass(image_bytes):
                    page_data.append(["i", image_bytes])
                    if save_images:
                        image_filename = f"page_{page_number + 1}_image_{image_index + 1}.png"
                        if image_save_path:
                            image_filename = image_save_path + "/" + image_filename
                        with open(image_filename, "wb") as image_file:
                            image_file.write(image_bytes)

        extracted_data.append(page_data)

    pdf_document.close()
    return extracted_data
