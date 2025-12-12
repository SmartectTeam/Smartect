# json (pydantic을 사용하여 데이터 모델을 정의)


class EventJson():
    cam_no: int            # 2
    event_type: str        # "touch"
    danger_level: int      # 1
    event_time: str        # "2025-01-01T12:00:00"
    screenshot_path: str   #"/images/capture_123.png"

    def __init__(self, cam_no: int, event_type: str, danger_level:int ,event_time: str, screenshot_path: str):
        self.cam_no = cam_no
        self.event_type = event_type
        self.danger_level = danger_level
        self.event_time = event_time
        self.screenshot_path = screenshot_path
