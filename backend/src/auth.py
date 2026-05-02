import os

import jwt
from flask import request


def verify_bearer_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return False, "Missing bearer token"

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return False, "Empty bearer token"

    secret = os.getenv("ACCESS_TOKEN_SECRET")
    if not secret:
        return False, "ACCESS_TOKEN_SECRET is not configured on backend"

    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return False, "Token expired"
    except jwt.InvalidTokenError:
        return False, "Invalid token"

    return True, payload
