from ultralytics import YOLO
import cv2

from common.config import ModelPath
from apps.fire_router.detector import fire_model_video, frame_detector


class ImageProcessor:
    def __init__(self):
        self.model = YOLO(ModelPath.FIRE_MODEL)
        if self.model:
            print("Model loaded")

    async def process_frame(self, cam_no, image_bytes, threshold_map):
        try:
            annotated_image = frame_detector(image_bytes)

            fire_json, fire_map = fire_model_video(self.model, annotated_image, threshold_map, cam_no)

            ret, buffer = cv2.imencode('.jpg', annotated_image, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
            encoded_image_bytes = buffer.tobytes()

            return fire_json, fire_map, encoded_image_bytes

        except Exception as e:
            print(e)
            return None, image_bytes
