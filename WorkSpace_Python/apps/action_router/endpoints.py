# 웹소캣을 통한 데이터 전송
from camera import phone_connect, snap_cam_connect, camera_disconnect
from apps.action_router.detector import action_model_video
import cv2
import asyncio
import websockets
import json
from common.config import PCPath


async def camera_post_video(pc_id, cam_id):
    pc2 = PCPath(pc_id)
    url = f"ws://{pc2.PC_IP}:8000/ws/input"

    # cap = phone_connect(cam_id)
    cap = snap_cam_connect(cam_id)
    async with websockets.connect(url) as websocket:
        print("PC2 연결 성공!")

        frame_count = 0
        skip_frame = 1000

        while True:
            ret, frame = cap.read()
            if not ret: break

            action_json = None
            frame_count += 1
            frame = cv2.resize(frame, (640, 480))

            if frame_count % skip_frame == 0:
                action_json = action_model_video(frame)

            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])

            await websocket.send(json.dumps(action_json))
            await websocket.send(buffer.tobytes())

            # await asyncio.sleep(0.01)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                camera_disconnect(cap)
                break