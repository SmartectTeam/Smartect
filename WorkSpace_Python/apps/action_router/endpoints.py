# 웹소캣을 통한 데이터 전송

import cv2
import asyncio

import msgpack
import websockets
import json
from common.config import PCPath, DataPath

# 웹소캣을 통한 데이터 전송
import sys
import os
from common.schemas import CombinedJson
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../../"))
if root_dir not in sys.path:
    sys.path.append(root_dir)


async def camera_post_video(source, detector, pc_id, cam_id):
    pc = PCPath(pc_id)
    url = f"ws://{pc.PC_IP}:8000/ws/input"

    print(f"[Endpoint] Connecting CCTV={cam_id} to {url} ...")

    while True:
        try:
            async with websockets.connect(url, ping_interval=None, ping_timeout=None) as websocket:
                print(f"[Endpoint] CCTV={cam_id} Connected!")

                receive_task = asyncio.create_task(
                    receive_settings_from_main(websocket, detector, cam_id)
                )

                while True:
                    ret, frame = source.read()
                    if not ret:
                        print(f"[Endpoint] Source ended for CCTV-{cam_id}")
                        break

                    # =======================================================
                    # [수정] 이미지를 640px로 미리 줄임
                    # =======================================================
                    h, w = frame.shape[:2]
                    new_w = 640
                    # 비율 유지하며 높이 계산
                    new_h = int(h * (new_w / w))

                    # 프레임 자체를 덮어씌움
                    frame = cv2.resize(frame, (new_w, new_h))
                    # =======================================================

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


async def receive_settings_from_main(websocket, detector, cam_id):
    """메인서버로부터 설정값 수신 및 적용"""
    try:
        while True:
            message = await websocket.recv()

            # 텍스트 메시지인지 확인 (설정은 JSON 텍스트)
            if isinstance(message, str):
                data = json.loads(message)

                if data["type"] == "settings_update":
                    # 확정 설정 적용
                    print(f"[Camera-{cam_id}] Settings updated")
                    apply_settings_to_detector(detector, data["data"], cam_id)

                elif data["type"] == "settings_preview":
                    # 미리보기 적용
                    print(f"[Camera-{cam_id}] ⚠️ Preview mode")
                    apply_settings_to_detector(detector, data["data"], cam_id, preview=True)

                elif data["type"] == "settings_discard":
                    # 원래 설정으로 복원
                    print(f"[Camera-{cam_id}] Settings discarded, restoring...")
                    restore_original_settings(detector, cam_id)

    except websockets.exceptions.ConnectionClosed:
        print(f"[Camera-{cam_id}] Settings receiver closed")
    except Exception as e:
        print(f"[Camera-{cam_id}] Error receiving settings: {e}")


# [추가] 설정 적용 함수
def apply_settings_to_detector(detector, settings: dict, cam_id: int, preview: bool = False):
    """MotionDetector에 설정값 적용"""
    try:
        # detector의 설정 업데이트
        detector.detection_mode = settings.get("detection_mode", "mix")
        detector.fall_check = settings.get("fall_check", True)
        detector.zone_check = settings.get("zone_check", True)
        detector.ai_check = settings.get("ai_check", True)

        detector.fall_ratio = settings.get("fall_ratio", 1.0)
        detector.reach_ratio = settings.get("reach_ratio", 0.75)
        detector.hip_ratio = settings.get("hip_ratio", 0.5)
        detector.ai_threshold = settings.get("ai_threshold", 0.7)

        detector.lock_duration = settings.get("lock_duration", 30)
        detector.zones = settings.get("zones", [])

        # 시각화 설정
        detector.vis_alert = settings.get("vis_alert", True)
        detector.vis_bbox = settings.get("vis_bbox", True)
        detector.vis_skeleton = settings.get("vis_skeleton", False)
        detector.vis_text = settings.get("vis_text", True)

        mode_text = "PREVIEW" if preview else "APPLIED"
        print(f"[Camera-{cam_id}] Settings {mode_text}: mode={detector.detection_mode}, zones={len(detector.zones)}")

    except Exception as e:
        print(f"[Camera-{cam_id}] Failed to apply settings: {e}")


# [추가] 원래 설정 복원 함수
def restore_original_settings(detector, cam_id: int):
    """저장된 설정 파일에서 원래 설정 로드"""
    try:
        config_path = DataPath(cam_id).SETTING_PATH
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                settings = json.load(f)
            apply_settings_to_detector(detector, settings, cam_id)
            print(f"[Camera-{cam_id}] Original settings restored")
        else:
            print(f"[Camera-{cam_id}] No settings file found, using defaults")
    except Exception as e:
        print(f"[Camera-{cam_id}] Failed to restore settings: {e}")