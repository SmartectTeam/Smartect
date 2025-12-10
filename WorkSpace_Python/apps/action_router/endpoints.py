# 웹소캣을 통한 데이터 전송
from camera import camera_connect, camera_disconnect
import cv2
import asyncio
import websockets
import json
from common.config import PC2Path


async def camera_post_video():
    pc2 = PC2Path
    url = f"ws://{pc2.PC2_IP}:8000/ws/input"

    cap = camera_connect()
    async with websockets.connect(url) as websocket:
        print("PC2 연결 성공!")

        while True:
            ret, frame = cap.read()
            if not ret: break

            # 행동 감지 모델 함수 return action_json

            action_data = {"is_touch": False, "confidence": 0.0}

            frame = cv2.resize(frame, (640, 480))

            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])

            await websocket.send(json.dumps(action_data))
            await websocket.send(buffer.tobytes())

            # await asyncio.sleep(0.01)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                camera_disconnect(cap)
                break