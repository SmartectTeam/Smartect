# 화재 감지 모델 탑재 - json 파일로 변환
# 실행 : uvicorn apps.fire_router.main:app --reload
import numpy as np
import cv2

from common.schemas import EventJson

#===================================
# action_router 작업을위한 임시코드
model = None
#====================================


from datetime import datetime

from common.schemas import EventJson, EventMap, CombinedJson

def frame_detector(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    decoded_frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return decoded_frame


def fire_model_video(model, frame, threshold_map, cam_no):
    min_conf = min(threshold_map.values())
    results = model(frame, stream=True, conf=min_conf, verbose=False)
    fire_map = []
    fire_json = []

    for result in results:
        boxes = result.boxes

        for box in boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])
            cls = int(box.cls[0])
            class_name = model.names[cls]

            target_conf = threshold_map.get(class_name, 0.5)

            if conf >= target_conf:
                fire_map.append(EventMap(
                    x1=x1,
                    y1=y1,
                    x2=x2,
                    y2=y2,
                    event_type=class_name,
                    confidence=conf
                ))
                if class_name == "fire":
                    fire_json.append(EventJson(
                        cam_no=cam_no,
                        event_type="fire",
                        danger_level=3,
                        event_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        screenshot_path="/images/fire_detected.jpg"
                    ))

                elif class_name == "smoke":
                    fire_json.append(EventJson(
                        cam_no=cam_no,
                        event_type="smoke",
                        danger_level=3,
                        event_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        screenshot_path="/images/fire_detected.jpg"
                    ))

    return fire_json, fire_map

def fire_objects():
    result_image = ""
    return result_image