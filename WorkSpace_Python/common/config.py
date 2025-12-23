# 공통 설정
import os
from pathlib import Path
from dotenv import load_dotenv


# 모든 요청에 대해 로그를 남김(미들웨어 클래스)
class LoggingMiddleware:# BaseHTTPMiddleware
    pass


# camera cam ip 정보 .env 파일에서 환경변수 가져오는 class
class PhoneCamPath:
    BASE_DIR = Path(__file__).resolve().parent.parent

    env_path = BASE_DIR / "property.env"
    load_dotenv(env_path)

    def __init__(self, cam_id):
        self.WEBCAM_IP = os.getenv(f"{cam_id}_IP")
        self.WEBCAM_PORT = os.getenv(f"{cam_id}_PORT")
        self.WEBCAM_ID = os.getenv(f"{cam_id}_ID")
        self.WEBCAM_PW = os.getenv(f"{cam_id}_PW")


# PC ip 정보
class PCPath:
    BASE_DIR = Path(__file__).resolve().parent.parent

    env_path = BASE_DIR / "property.env"

    load_dotenv(env_path)

    def __init__(self, pc_id):
        self.PC_IP = os.getenv(f"{pc_id}_IP")
        if not self.PC_IP:
            print(f"[Config]Warning:{pc_id}_IP not found in {self.env_path}")


# 모델 정보
class ModelPath:
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    # weight 경로 (모델 추가 시 이쪽에 경로 추가)
    FIRE_MODEL = os.path.join(BASE_DIR, "weight", "fireModel.pt")
    YOLO_MODEL = os.path.join(BASE_DIR, "weight", "yolo11n-pose.pt")
    LSTM_MODEL = os.path.join(BASE_DIR, "weight", "LSTM_model_v0.95.h5")
    LSTM_MODEL_JSON = os.path.join(BASE_DIR, "weight", "LSTM_model_v0.95.json")
    USE_GPU = True


# 설정
class DataPath:
    def __init__(self, cam_no):
        self.BASE_DIR = Path(__file__).resolve().parent.parent

        self.SETTING_PATH = self.BASE_DIR / f"settings/cam_{cam_no}.json"
        self.PREVIEW_PATH = self.BASE_DIR / f"settings/cam_{cam_no}_preview.json"


# 캡쳐
class CapturePath:
    cap_path = r"\\220-29\공유폴더\captures"

