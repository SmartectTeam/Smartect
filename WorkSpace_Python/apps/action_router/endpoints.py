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

# 인자 4개 받도록 변경
async def camera_post_video(source, detector, pc_id, cam_id):
    pc = PCPath(pc_id)
    url = f"ws://{pc.PC_IP}:8000/ws/input"

    print(f"[Endpoint] Connecting CCTV={cam_id} to {url} ...")

    try:
        async with websockets.connect(url) as websocket:
            print(f"[Endpoint] CCTV={cam_id} Connected!")

            while True:
                ret, frame = source.read()
                if not ret:
                    print(f"[Endpoint] Source ended for CCTV-{cam_id}")
                    break

                # 로직 수행 : cam_id 울 넘겨서 데이터 안에 번호를 담음
                annotated_frame, event_data = detector.process_frame(frame, cam_id)

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






