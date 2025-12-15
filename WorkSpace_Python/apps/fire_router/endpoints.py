# 웹소캣을 통한 데이터 전송
import cv2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import base64
import numpy as np


from apps.fire_router.detector import fire_model_video, frame_detector

router = APIRouter()

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
    skip_frame = 10
    threshold_map = {
        'fire': 0.70,
        'smoke': 0.30
    }

    try:
        while True:
            action_json = await websocket.receive_json()
            image_bytes = await websocket.receive_bytes()

            fire_json = None

            # json 안에 base64 이미지를 openCV 이미지로 변환
            if action_json and "img_base64" in action_json:
                img_data = base64.b64decode(action_json["img_base64"])
                np_arr = np.frombuffer(img_data, np.uint8)
                frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                frame_count += 1
            else:
                continue



            if frame_count % skip_frame == 0:
                fire_json = fire_model_video(frame, threshold_map)

            # 처리된 이미지를 다시 base64로 변환하여 json에 업데이트
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
            if ret:
                action_json["img_base64"] = base64.b64encode(buffer).decode('utf-8')

            for viewer in connected_viewers:
                try:
                    # json만 전송(이미지가 들어있음)
                    if fire_json is not None:
                        final_json = {
                            "fire_info": fire_json,
                            "action_info": action_json
                        }
                        await viewer.send_json(final_json)

                except Exception as e:
                    print(f"[ENDPOINTS] 전송 실패: {e}")
                    connected_viewers.remove(viewer)

    except WebSocketDisconnect:
        print("PC1 접속 끊김")