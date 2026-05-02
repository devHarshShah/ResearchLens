import cv2
import numpy as np


def is_blurry(image_bytes, threshold=100):
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    fm = cv2.Laplacian(gray, cv2.CV_64F).var()
    return fm < threshold


def is_solid_color(image_bytes, border_size=20, threshold=10):
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    h, w = image.shape[:2]
    cropped = image[border_size : h - border_size, border_size : w - border_size]
    std_dev = np.std(cropped)
    unique_colors = np.unique(cropped.reshape(-1, cropped.shape[2]), axis=0)
    return std_dev < threshold or len(unique_colors) <= 1


def image_pass(image_bytes):
    return not (is_blurry(image_bytes) or is_solid_color(image_bytes))
