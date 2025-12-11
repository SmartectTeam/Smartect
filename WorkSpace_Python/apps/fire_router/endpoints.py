# 웹소캣을 통한 데이터 전송
import cv2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from apps.fire_router.detector import frame_detector, fire_model_video

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
            final_json = None
            frame_count += 1
            frame = frame_detector(image_bytes)

            if frame_count % skip_frame == 0:
                fire_json = fire_model_video(frame, threshold_map)

            if fire_json or action_json is not None:
                final_json = {
                    "fire_info": fire_json,
                    "action_info": action_json
                }
                print(final_json)


            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])

            for viewer in connected_viewers:
                try:
                    await viewer.send_json(final_json)
                    await viewer.send_bytes(buffer)
                except Exception as e:
                    print(f"전송 실패: {e}")
                    connected_viewers.remove(viewer)

    except WebSocketDisconnect:
        print("PC1 접속 끊김")