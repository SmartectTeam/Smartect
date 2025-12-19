# 웹소캣을 통한 데이터 전송

import cv2
import asyncio

import msgpack
import websockets
from common.config import PCPath

# 웹소캣을 통한 데이터 전송
import sys
import os
from common.schemas import CombinedJson
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../../"))
if root_dir not in sys.path:
    sys.path.append(root_dir)


# 인자 4개 받도록 변경
async def camera_post_video(source, detector, pc_id, cam_id):
    pc = PCPath(pc_id)
    url = f"ws://{pc.PC_IP}:8000/ws/input"

    print(f"[Endpoint] Connecting CCTV={cam_id} to {url} ...")

    while True:
        try:
            async with websockets.connect(url, ping_interval=None, ping_timeout=None) as websocket:
                print(f"[Endpoint] CCTV={cam_id} Connected!")

                while True:
                    ret, frame = source.read()
                    if not ret:
                        print(f"[Endpoint] Source ended for CCTV-{cam_id}")
                        break

                    result, enc_img = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 50])

                    if result:
                        img_bytes = enc_img.tobytes()

                        action_json, action_map = detector.process_frame(frame, cam_id)

                        combined_json = CombinedJson(
                            cam_no=cam_id,
                            img_bytes=img_bytes,
                            action_json=action_json,
                            action_map=action_map,
                            fire_json=[],
                            fire_map=[]
                        )

                        binary_payload = msgpack.packb(combined_json.model_dump(), use_bin_type=True)

                        await websocket.send(binary_payload)

                        await asyncio.sleep(0.01)

        except Exception as e:
            print(f"[Endpoint] Error on CCTV-{cam_id}: {e}")
            print("3초 후 재 접속")
            await asyncio.sleep(3)

        finally:
            source.release()