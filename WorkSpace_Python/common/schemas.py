# json (pydantic을 사용하여 데이터 모델을 정의)
# __init__ 필요 없음(BaseModel 이 자동으로 처리)
from pydantic import BaseModel
from typing import List, Optional, Any, Dict


class EventJson(BaseModel):
    cam_no: int            # 2
    event_type: str        # "touch"
    danger_level: int      # 1
    event_time: str        # "2025-01-01T12:00:00"
    screenshot_path: str   #"/images/capture_123.png"


class EventMap(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int
    event_type: str
    confidence: float


class CombinedJson(BaseModel):
    type: str = "COMBINED"
    cam_no: int
    img_bytes: Optional[bytes] = None
    fire_json: List[EventJson] = []
    fire_map: List[EventMap] = []
    action_json: List[EventJson] = []
    action_map: List[EventMap] = []


class SettingsRequest(BaseModel):
    cam_id: int
    detection_mode: str = "mix"
    fall_check: bool
    zone_check: bool
    ai_check: bool
    fall_ratio: float
    reach_ratio: float
    hip_ratio: float
    ai_threshold: float
    lock_duration: int
    zones: List[Dict[str, Any]]

    # 보기설정
    vis_alert: bool
    vis_bbox: bool
    vis_skeleton: bool
    vis_text: bool