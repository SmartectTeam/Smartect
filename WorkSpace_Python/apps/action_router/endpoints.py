# 웹소캣을 통한 데이터 전송

import sys
import os

# from apps.action_router.main import root_dir

# 경로설정
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../../"))
if root_dir not in sys.path:
    sys.path.append(root_dir)

# from apps.action_router.camera import phone_connect, snap_cam_connect, camera_disconnect, cam_connect
import cv2
import asyncio
import websockets
import json
from common.config import PCPath
from apps.action_router.detector import MotionDetector


'''
# 원본 코드
async def camera_post_video(pc_id, cam_id):
    pc2 = PCPath(pc_id)
    url = f"ws://{pc2.PC_IP}:8000/ws/input"
    
    Md = MotionDetector(settings_path=None)

    # cap = phone_connect(cam_id)
    # cap = snap_cam_connect(cam_id)
    cap = cam_connect(cam_id)

    async with websockets.connect(url) as websocket:
        print("PC2 연결 성공!")

        frame_count = 0
        skip_frame = 1000

        while True:
            ret, frame = cap.read()
            if not ret: break

            Md.process_frame(frame)

            action_data = {"is_touch": False, "confidence": 0.0}

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
'''
# 카메라 ID를 정수로 변환하는 매핑
def cam_id_to_int(cam_id):
    """카메라 ID 문자열을 정수로 변환 (EventJson의 cam_no는 int 타입)"""
    cam_id_map = {
        "HSYCAM": 1,
        "AHSCAM": 2,
    }
    
    # 매핑에 있으면 해당 정수 반환
    if cam_id in cam_id_map:
        return cam_id_map[cam_id]
    
    # 매핑에 없으면 문자열이 숫자면 그대로 반환, 아니면 해시값 사용
    try:
        return int(cam_id)
    except ValueError:
        return abs(hash(cam_id)) % 1000

# 인자 4개 받도록 변경
async def camera_post_video(source, detector, pc_id, cam_id):
    pc = PCPath(pc_id)
    url = f"ws://{pc.PC_IP}:8000/ws/input"

    print(f"[Endpoint] Connecting CCTV={cam_id} to {url} ...")
    
    # cam_id를 정수로 변환 (detector.process_frame의 EventJson.cam_no는 int 타입)
    cam_no = cam_id_to_int(cam_id)

    try:
        async with websockets.connect(url) as websocket:
            print(f"[Endpoint] CCTV={cam_id} Connected!")

            while True:
                ret, frame = source.read()
                if not ret:
                    print(f"[Endpoint] Source ended for CCTV-{cam_id}")
                    break

                # 로직 수행 : cam_no(정수)를 넘겨서 데이터 안에 번호를 담음
                annotated_frame, event_data = detector.process_frame(frame, cam_no)

                # 이미지 인코딩
                ret, buffer = cv2.imencode('.jpg', annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])

                if ret:
                    # json 전송
                    await websocket.send(event_data.model_dump_json())
                    # 이미지 바이트 전송
                    await websocket.send(buffer.tobytes())

                await asyncio.sleep(0.01)

    except Exception as e:
        print(f"[Endpoint] Error on CCTV-{cam_id}: {e}")

    finally:
        source.release()