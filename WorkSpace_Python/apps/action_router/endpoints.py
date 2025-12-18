# 웹소캣을 통한 데이터 전송

import cv2
import asyncio
import websockets
from common.config import PCPath
from  fastapi import APIRouter

# 웹소캣을 통한 데이터 전송
import sys
import os
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

                # await asyncio.sleep(0.01)

    except Exception as e:
        print(f"[Endpoint] Error on CCTV-{cam_id}: {e}")

    finally:
        source.release()


router = APIRouter()


"""
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
"""






