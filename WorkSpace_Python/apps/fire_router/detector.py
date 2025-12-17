# 화재 감지 모델 탑재 - json 파일로 변환
# 실행 : uvicorn apps.fire_router.main:app --reload
from ultralytics import YOLO
from common.config import ModelPath
import numpy as np
import cv2
from common.schemas import EventJson

model = YOLO(ModelPath.FIRE_MODEL)
if model:
    print("Model loaded")

def frame_detector(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    decoded_frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return decoded_frame

def fire_model_video(frame, threshold_map):
    min_conf = min(threshold_map.values())
    results = model(frame, stream=True, conf=min_conf, verbose=False)
    fire_data = None

    for result in results:
        boxes = result.boxes
        fire_map = []
        fire_json = []  # 리스트로 유지

        for box in boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])
            cls = int(box.cls[0])
            class_name = model.names[cls]

            target_conf = threshold_map.get(class_name, 0.5)

            if conf >= target_conf:
                fire_map.append({
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2,
                    "event_type": class_name,
                    "confidence": round(conf, 2)
                })
                if class_name == "fire":
                    fire_json.append({
                        "cam_no": 0,
                        "event_type": "fire",
                        "danger_level": 0,
                        "event_time": "",
                        "screenshot_path": ""
                    })

                elif class_name == "smoke":
                    fire_json.append({
                        "cam_no": 0,
                        "event_type": "smoke",
                        "danger_level": 0,
                        "event_time": "",
                        "screenshot_path": ""
                    })

        fire_data = [fire_map, fire_json]

    return fire_data


def fire_objects():
    result_image = ""
    return result_image