# json (pydantic을 사용하여 데이터 모델을 정의)


class EventJson():
    cam_no: int            # 2
    event_type: str        # "touch"
    danger_level: int      # 1
    event_time: str        # "2025-01-01T12:00:00"
    screenshot_path: str   #"/images/capture_123.png"