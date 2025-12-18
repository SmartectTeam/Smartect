# 웹소캣을 통한 데이터 전송
import cv2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import base64
import numpy as np
from typing import List
from pydantic import BaseModel
import os

from apps.fire_router.detector import fire_model_video, frame_detector
from typing import List, Dict, Any, Union

# 경로 설정 (액션라우터가 보는 settings 폴더와 같은 곳을 바라보게 함)
current_dir = os.path.dirname(os.path.abspath(__file__))
SETTINGS_DIR = os.path.abspath(os.path.join(current_dir, "../action_router/settings"))

router = APIRouter()

# =================================================================
# 웹에서 오는 설정 받기
# =================================================================
# 프론트에서 저장할때 오는 데이터
class SettingsRequest(BaseModel):
    cam_id: int
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

# 셋팅 파일 생성
@router.post("/settings/update")
async def update_settings(data: SettingsRequest):
    os.makedirs(SETTINGS_DIR, exist_ok=True)
    file_path = os.path.join(SETTINGS_DIR, f"cam_{data.cam_id}.json")

    try:
        with open(file_path, "w", encoding='utf-8') as f:
            json.dump(data.dict(), f, indent=4, ensure_ascii=False)
        return {"status": "success", "message": "Saved"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# 설정 불러오기
@router.get("/settings/get")
async def get_settings(cam_id: int):
    file_path = os.path.join(SETTINGS_DIR, f"cam_{cam_id}.json")

    if not os.path.exists(file_path):
        return {}

    with open(file_path, "r", encoding='utf-8') as f:
        return json.load(f)


# =============================================================================

connected_viewers = []

@router.websocket("/ws/output")
async def output_api(websocket: WebSocket):
    await websocket.accept()
    connected_viewers.append(websocket)
    print(f"PC3(웹) 접속, 현재 접속자 : {len(connected_viewers)}명")

    try:
        while True:
            await websocket.receive_text() # 유지용
    except WebSocketDisconnect:
        if websocket in connected_viewers:
            connected_viewers.remove(websocket)
        print("PC3(웹) 접속 끊김")


@router.websocket("/ws/input")
async def input_api(websocket: WebSocket):
    await websocket.accept()
    print("PC1(액션) 접속")

    frame_count = 0
    skip_frame = 10
    threshold_map = {'fire': 0.70, 'smoke': 0.30}

    try:
        while True:
            # 1. 데이터 수신
            action_json = await websocket.receive_json()
            image_bytes = await websocket.receive_bytes()

            # 2. 파이어 감지 (이미지 디코딩 안전하게)
            fire_json = None
            if frame_count % skip_frame == 0:
                try:
                    np_arr = np.frombuffer(image_bytes, np.uint8)
                    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                    if frame is not None:
                        fire_json = fire_model_video(frame, threshold_map)
                except Exception as e:
                    print(f"[Fire Check Error] {e}")

            frame_count += 1

            # 3. 데이터 정리
            if "img_base64" in action_json:
                del action_json["img_base64"]

            final_metadata = {
                "fire_info": fire_json,
                "action_info": action_json
            }

            # [핵심 수정] 리스트를 복사([:])해서 순회해야 삭제 시 에러 안 남
            for viewer in connected_viewers[:]:
                try:
                    await viewer.send_json(final_metadata)
                    await viewer.send_bytes(image_bytes)
                except Exception as e:
                    print(f"[전송 실패] 뷰어 제거: {e}")
                    if viewer in connected_viewers:
                        connected_viewers.remove(viewer)

    except WebSocketDisconnect:
        print("PC1(액션) 접속 끊김")
    except Exception as e:
        print(f"[SERVER ERROR] {e}") # 서버가 죽는 진짜 원인을 로그로 남김

