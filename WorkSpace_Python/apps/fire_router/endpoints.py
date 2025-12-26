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

connected_cameras = {}

# 셋팅 파일 생성
@router.post("/settings/update")
async def update_settings(data: SettingsRequest):
    file_path = DataPath(data.cam_id).SETTING_PATH

    try:
        with open(file_path, "w", encoding='utf-8') as f:
            json.dump(data.dict(), f, indent=4, ensure_ascii=False)

            if data.cam_id in connected_cameras:
                message = {
                    "type": "settings_update",
                    "data": data.dict()
                }
                packed_message = msgpack.packb(message, use_bin_type=True)
                await connected_cameras[data.cam_id].send_bytes(packed_message)
                print(f"✅ [Main] Settings saved and sent to Camera {data.cam_id}")
            else:
                print(f"⚠️ [Main] Settings saved but Camera {data.cam_id} not connected")

        return {"status": "success", "message": "Saved"}
    except Exception as e:
        print(f"❌ [Main] Error in update_settings: {e}")
        return {"status": "error", "message": str(e)}


# 설정 불러오기
@router.get("/settings/get")
async def get_settings(cam_id: int):
    file_path = DataPath(cam_id).SETTING_PATH

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

    cam_no = None
    frame_count = 0
    skip_frame = 40
    threshold_map = {'fire': 0.70, 'smoke': 0.30}

    try:
        while True:
            payload = await websocket.receive_bytes()

            data_dict = msgpack.unpackb(payload, raw=False, use_list=False)

            cam_no = data_dict['cam_no']

            # 설정 연결 코드(캠 등록)
            if cam_no not in connected_cameras:
                connected_cameras[cam_no] = websocket
                print(f"Camera {cam_no} registered")

                # 설정 전송
                await send_latest_settings_to_cam(cam_no, websocket)

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

                final_payload = msgpack.packb(data_dict, use_bin_type=True)

            if connected_viewers:
                await broadcast_to_viewers(final_payload)

    except WebSocketDisconnect:
        print("PC1 접속 끊김")
        # 설정 연결 해제 코드
        if cam_no and cam_no in connected_cameras:
            del connected_cameras[cam_no]
            print(f"Camera {cam_no} unregistered")


async def send_latest_settings_to_cam(cam_id: int, websocket: WebSocket):
    """캠 연결 시 저장된 설정을 전송"""
    try:
        file_path = DataPath(cam_id).SETTING_PATH
        if os.path.exists(file_path):
            with open(file_path, "r", encoding='utf-8') as f:
                settings = json.load(f)

            message = {
                "type": "settings_update",
                "data": settings
            }
            packed_message = msgpack.packb(message, use_bin_type=True)
            await websocket.send_bytes(packed_message)
            print(f"Sent latest settings to Camera {cam_id}")
    except Exception as e:
        print(f"Failed to send settings to Camera {cam_id}: {e}")


async def broadcast_to_viewers(message: bytes):
    # 리스트 복사본 사용 필수
    for viewer in list(connected_viewers):
        try:
            # create_task로 던져서 다른 클라이언트가 느려도 영향을 안 받게 함
            asyncio.create_task(viewer.send_bytes(message))
        except:
            if viewer in connected_viewers:
                connected_viewers.remove(viewer)


# 개별 전송 및 에러 처리 함수
async def safe_send(viewer: WebSocket, message: bytes):
    try:
        await viewer.send_bytes(message)
    except Exception:
        # 전송 실패 시 목록에서 제거 (주의: 리스트 순회 중 제거 문제 해결 필요)
        if viewer in connected_viewers:
            connected_viewers.remove(viewer)