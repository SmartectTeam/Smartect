# 웹소캣을 통한 데이터 전송
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json

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

    try:
        while True:
            action_json = await websocket.receive_json()
            image_bytes = await websocket.receive_bytes()

            # 화재 감지 모델 함수 return eventJson

            fire_result = {"is_fire": False}

            final_json = {
                "fire_info": fire_result,
                "action_info": action_json
            }

            for viewer in connected_viewers:
                try:
                    await viewer.send_json(final_json)
                    await viewer.send_bytes(image_bytes)
                except Exception as e:
                    print(f"전송 실패: {e}")
                    connected_viewers.remove(viewer)

    except WebSocketDisconnect:
        print("PC1 접속 끊김")