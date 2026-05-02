import os

from flask import Flask, request
from flask_cors import CORS
from flask_restful import Api

from src.api.routes import PDFUploadAPI, QueryAPI, StatusAPI


def create_app():
    if not os.getenv("ACCESS_TOKEN_SECRET"):
        raise RuntimeError(
            "ACCESS_TOKEN_SECRET is not set. "
            "Add it to backend/.env and ensure it matches frontend/.env.local."
        )

    app = Flask(__name__)
    CORS(
        app,
        origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "OPTIONS"],
    )

    @app.after_request
    def apply_cors_headers(response):
        origin = request.headers.get("Origin", "")
        if origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return response

    api = Api(app)
    api.add_resource(QueryAPI, "/api")
    api.add_resource(PDFUploadAPI, "/uploadpdf")
    api.add_resource(StatusAPI, "/status")

    return app
