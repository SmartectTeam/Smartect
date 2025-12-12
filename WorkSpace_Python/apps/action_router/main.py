# 매인 실행문
from sympy import roots

#test

from endpoints import camera_post_video
import asyncio
import sys
import os
import asyncio

# [경로 설정] common 폴더 인식을 위한 상위경로 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../.."))
if root_dir not in sys.path:
    sys.path.append(root_dir)

from endpoints import camera_post_video
from camera import WebcamStream, FileLoofStream
from detector import  MotionDetector
from detect.ai_models import AIModels

"""
# 원본 보존

pc_id = "HSYPC"
cam_id = 0

if __name__ == "__main__":
    asyncio.run(camera_post_video(pc_id, cam_id))
"""

# 설정 파일 경로(app/action_router/settings/)
SETTINGS_DIR = os.path.join(current_dir, "settings")
os.makedirs(SETTINGS_DIR, exist_ok=True)

#============================================================카메라로
# [CCTV-03] 실시간 카메라
CAM_ID_3 = 0
CONFIG_FILE_3 = os.path.join(SETTINGS_DIR, "cam_3.json")

# [CCTV-04] 파일 반복
VIDEO_PATH_4 = "C:/teamproject/Smartect/video/test.mp4"
CONFIG_FILE_4 = os.path.join(SETTINGS_DIR, "cam_4.json")

PC_ID = "HSMPC"

async def main():
    print(">>>[System] Initializing Models...")
    shared_models = AIModels()

    # CCTV 03
    print(">>>[Setup] CCTV-3(live)")
    detector3 = MotionDetector(settings_path=CONFIG_FILE_3)
    detector3.models = shared_models
    source3 = WebcamStream(CAM_ID_3)

    # CCTV 04
    print(f">>>[Setup] CCTV-4(file)")
    detector4 = MotionDetector(settings_path=CONFIG_FILE_4)
    detector4.models = shared_models
    source4 = FileLoofStream(VIDEO_PATH_4)

    print(">>> [System] Streams Started.")
    await asyncio.gather(
        camera_post_video(source3, detector3, PC_ID, 3)
        # camera_post_video(source4, detector4, PC_ID, 4)
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n>>> [System] Stopped.")




