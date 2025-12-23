# 웹소캣을 통한 데이터 전송
import asyncio
import json
import os

import msgpack
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from apps.fire_router.services import ImageProcessor
from common.schemas import SettingsRequest
from common.config import DataPath


router = APIRouter()
service = ImageProcessor()

# =================================================================
# 웹에서 오는 설정 받기
# =================================================================

# 셋팅 파일 생성
@router.post("/settings/update")
async def update_settings(data: SettingsRequest):
    file_path = DataPath(data.cam_id).SETTING_PATH

    try:
        with open(file_path, "w", encoding='utf-8') as f:
            json.dump(data.dict(), f, indent=4, ensure_ascii=False)
        return {"status": "success", "message": "Saved"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# 설정 불러오기
@router.get("/settings/get")
async def get_settings(cam_id: int):
    file_path = DataPath(cam_id).SETTING_PATH

    if not os.path.exists(file_path):
        return {}

    with open(file_path, "r", encoding='utf-8') as f:
        return json.load(f)


# 미리보기 저장 (임시 파일 생성)
@router.post("/settings/preview")
async def preview_settings(data: SettingsRequest):
    file_path = DataPath(data.cam_id).PREVIEW_PATH
    try:
        with open(file_path, "w", encoding='utf-8') as f:
            json.dump(data.dict(), f, indent=4, ensure_ascii=False)
        return {"status": "success", "message": "Preview"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# 미리보기 취소 (임시 파일 삭제)
@router.post("/settings/discard")
async def discard_preview(data: SettingsRequest):
    # data에는 cam_id만 있어도 됨
    file_path = DataPath(data.cam_id).PREVIEW_PATH
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
        return {"status": "success", "message": "Discarded"}
    except Exception as e:
        # 파일이 없어도 에러 아님 (이미 지워졌거나 없던 상태)
        return {"status": "success", "message": "Nothing to discard"}


# 기존 저장 함수 (저장 후 임시 파일 삭제)
@router.post("/settings/update")
async def update_settings(data: SettingsRequest):
    file_path = DataPath(data.cam_id).SETTING_PATH
    preview_path = DataPath(data.cam_id).PREVIEW_PATH # [추가됨]

    try:
        # 원본 저장
        with open(file_path, "w", encoding='utf-8') as f:
            json.dump(data.dict(), f, indent=4, ensure_ascii=False)

        # [추가됨] 저장이 확정되었으므로 미리보기 파일은 삭제 (청소)
        if os.path.exists(preview_path):
            os.remove(preview_path)

        return {"status": "success", "message": "Saved"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
# =============================================================================


connected_viewers = []


@router.websocket("/ws/output")
async def output_api(websocket: WebSocket):
    await websocket.accept()
    connected_viewers.append(websocket)
    print(f"PC3 접속, 현재 접속자 : {len(connected_viewers)}명")

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_viewers.remove(websocket)
        print("PC3 접속 끊김")


@router.websocket("/ws/input")
async def input_api(websocket: WebSocket):
    await websocket.accept()
    print("PC1 접속")

    frame_count = 0
    skip_frame = 40
    threshold_map = {'fire': 0.70, 'smoke': 0.30}

    try:
        while True:
            payload = await websocket.receive_bytes()

            data_dict = msgpack.unpackb(payload, raw=False)

            cam_no = data_dict['cam_no']

            frame_count += 1

            needs_processing = (frame_count % skip_frame == 0)

            final_payload = payload

            if needs_processing:
                img_bytes = data_dict.get('img_bytes')
                fire_json, fire_map = await service.process_frame(cam_no, img_bytes, threshold_map)

                fire_json_dicts = [item.model_dump() for item in fire_json]
                fire_map_dicts = [item.model_dump() for item in fire_map]

                data_dict['fire_json'] = fire_json_dicts
                data_dict['fire_map'] = fire_map_dicts

                final_payload = msgpack.packb(data_dict)

            if connected_viewers:
                await broadcast_to_viewers(final_payload)

    except WebSocketDisconnect:
        print("PC1 접속 끊김")


async def broadcast_to_viewers(message: bytes):
    if not connected_viewers:
        return

    tasks = []
    for viewer in connected_viewers:
        tasks.append(safe_send(viewer, message))

    await asyncio.gather(*tasks)


# 개별 전송 및 에러 처리 함수
async def safe_send(viewer: WebSocket, message: bytes):
    try:
        await viewer.send_bytes(message)
    except Exception:
        # 전송 실패 시 목록에서 제거 (주의: 리스트 순회 중 제거 문제 해결 필요)
        if viewer in connected_viewers:
            connected_viewers.remove(viewer)