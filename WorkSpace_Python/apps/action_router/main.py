# 매인 실행문
import asyncio
import sys
import os

# [경로 설정] common 폴더 인식을 위한 상위경로 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../.."))
if root_dir not in sys.path:
    sys.path.append(root_dir)

# 설정 파일 경로(app/action_router/settings/)
SETTINGS_DIR = os.path.join(current_dir, "settings")
os.makedirs(SETTINGS_DIR, exist_ok=True)

from apps.action_router.endpoints import camera_post_video
from apps.action_router.camera import WebcamStream, FileLoofStream
from apps.action_router.detector import  MotionDetector
from apps.action_router.detect.ai_models import AIModels




# [CCTV-01] 파일 반복
CAM_ID_1 = 0
CONFIG_FILE_1 = os.path.join(SETTINGS_DIR, "cam_1.json")
# VIDEO_PATH_1 = r"C:\Users\hsy\Desktop\old.mp4"
# CONFIG_FILE_1 = os.path.join(SETTINGS_DIR, "cam_1.json")

# [CCTV-02] 파일 반복
# CAM_ID_2 = "HSYCAM"
# CONFIG_FILE_2 = os.path.join(SETTINGS_DIR, "cam_2.json")
VIDEO_PATH_2 = r"C:\Users\hsy\Desktop\old.mp4"
CONFIG_FILE_2 = os.path.join(SETTINGS_DIR, "cam_2.json")

# [CCTV-03] 실시간 카메라
VIDEO_PATH_3 = r"C:\Users\hsy\Desktop\old.mp4"
CONFIG_FILE_3 = os.path.join(SETTINGS_DIR, "cam_3.json")

# [CCTV-04] 파일 반복
VIDEO_PATH_4 = r"C:\Users\hsy\Desktop\old.mp4"
CONFIG_FILE_4 = os.path.join(SETTINGS_DIR, "cam_4.json")


async def main(pc_id):
    print(">>>[System] Initializing Models...")
    shared_models = AIModels()


    # CCTV 01
    print(">>>[Setup] CCTV-1(live)")
    detector1 = MotionDetector(settings_path=CONFIG_FILE_1)
    detector1.models = shared_models
    source1 = WebcamStream(CAM_ID_1)
    # source1 = FileLoofStream(VIDEO_PATH_1)

    # CCTV 02
    print(">>>[Setup] CCTV-2(live)")
    detector2 = MotionDetector(settings_path=CONFIG_FILE_2)
    detector2.models = shared_models
    # source2 = WebcamStream(CAM_ID_2)
    source2 = FileLoofStream(VIDEO_PATH_2)

    # CCTV 03
    print(">>>[Setup] CCTV-3(live)")
    detector3 = MotionDetector(settings_path=CONFIG_FILE_3)
    detector3.models = shared_models
    source3 = FileLoofStream(VIDEO_PATH_3)

    # CCTV 04
    print(f">>>[Setup] CCTV-4(file)")
    detector4 = MotionDetector(settings_path=CONFIG_FILE_4)
    detector4.models = shared_models
    source4 = FileLoofStream(VIDEO_PATH_4)

    print(">>> [System] Streams Started.")
    await asyncio.gather(
        camera_post_video(source1, detector1, pc_id, 1),
        # camera_post_video(source2, detector2, pc_id, 2),
        # camera_post_video(source3, detector3, pc_id, 3),
        # camera_post_video(source4, detector4, pc_id, 4)
    )


PC_ID = "HSYPC"


if __name__ == "__main__":
    try:
        asyncio.run(main(PC_ID))
    except KeyboardInterrupt:
        print("\n>>> [System] Stopped.")