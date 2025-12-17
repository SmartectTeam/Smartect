# 웹소캣을 통한 데이터 전송
import cv2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json

from apps.fire_router.services import ImageProcessor
from common.schemas import CombinedJson

router = APIRouter()
service = ImageProcessor()

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
    skip_frame = 30
    threshold_map = {
        'fire': 0.70,
        'smoke': 0.30
    }

    try:
        while True:
            action_json = await websocket.receive_json()
            image_bytes = await websocket.receive_bytes()

            fire_json = None
            fire_map = None
            encoded_image_bytes = image_bytes
            cam_no = action_json["cam_no"]

            if cam_no == 1:
                frame_count += 1

            if frame_count % skip_frame == 0:
                fire_json, fire_map, encoded_image_bytes = await service.process_frame(cam_no, image_bytes, threshold_map)

            for viewer in connected_viewers:
                try:
                    # 감지가 발생했을 때만 JSON 전송
                    if fire_json is not None or (action_json is not None and action_json.get("is_touch")):
                        try:
                            final_json = CombinedJson(
                                fire_json=fire_json,
                                fire_map=fire_map,
                                action_json=[action_json],
                                action_map=[]
                            )
                            await viewer.send_json(final_json.model_dump())
                        except Exception as json_error:
                            print(f"[ENDPOINTS] JSON 전송 실패: {json_error}")
                            print(f"[ENDPOINTS] fire_json 타입: {type(fire_json)}, 값: {fire_json}")

                    # 영상은 항상 전송
                    await viewer.send_bytes(encoded_image_bytes)
                except Exception as e:
                    print(f"[ENDPOINTS] 전송 실패: {e}")
                    connected_viewers.remove(viewer)

    except WebSocketDisconnect:
        print("PC1 접속 끊김")