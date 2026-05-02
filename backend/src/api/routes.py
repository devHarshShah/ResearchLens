from flask import request
from flask_restful import Resource
from werkzeug.utils import secure_filename

from src.auth import verify_bearer_token
from src.config.settings import UPLOADS_DIR, ensure_uploads_dir, get_uploaded_pdf_paths
from src.services.query_service import image_text
from src.services.vector_service import rebuild_vector_store, vector_search

try:
    from win32com import client as win_client
except ImportError:
    win_client = None


class QueryAPI(Resource):
    def post(self):
        try:
            ok, auth_payload = verify_bearer_token()
            if not ok:
                return {"message": "Forbidden", "error": auth_payload}, 403

            data = request.get_json()
            response = {}

            if data["key"] == 100:
                response["val"] = "lol"
            elif data["key"] == 101:
                query = data["query"]
                language = data["language"]
                text_result, has_image = image_text(query, language)
                # Also return raw candidate scores for the UI to render
                raw = vector_search(query, top_k=3)
                candidates = [m["metadata"] for m in raw["matches"]]
                response["val"] = (text_result, has_image, candidates)

            return {"message": "Data received", "data": response.get("val")}, 200
        except Exception as exc:
            return {"message": "Query failed", "error": str(exc)}, 500


class StatusAPI(Resource):
    def get(self):
        ok, auth_payload = verify_bearer_token()
        if not ok:
            return {"message": "Forbidden", "error": auth_payload}, 403

        files = [p.name for p in get_uploaded_pdf_paths()]
        return {
            "uploadedPdfExists": len(files) > 0,
            "uploadedPdfCount": len(files),
            "uploadedPdfFiles": files,
        }, 200


class PDFUploadAPI(Resource):
    def post(self):
        try:
            ok, auth_payload = verify_bearer_token()
            if not ok:
                return {"message": "Forbidden", "error": auth_payload}, 403

            if win_client is not None:
                win_client.pythoncom.CoInitialize()

            files = request.files.getlist("files")
            if not files:
                single = request.files.get("file")
                if single:
                    files = [single]

            if not files:
                return {"message": "No file part in the request"}, 400

            ensure_uploads_dir()
            saved_files = []

            for file in files:
                if file.filename == "":
                    continue
                if not file.filename.lower().endswith(".pdf"):
                    return {"message": f"Unsupported file type: {file.filename}"}, 400

                filename = secure_filename(file.filename)
                if not filename:
                    continue
                output_path = UPLOADS_DIR / filename
                file.save(str(output_path))
                saved_files.append(filename)

            if not saved_files:
                return {"message": "No valid PDF files were uploaded"}, 400

            rebuild_vector_store()

            return {
                "message": "PDF files uploaded and indexed successfully",
                "uploadedFiles": saved_files,
                "uploadedPdfCount": len(saved_files),
            }, 200
        except Exception as exc:
            return {"message": "Upload/indexing failed", "error": str(exc)}, 500
