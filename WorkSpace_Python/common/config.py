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


# PC2 ip 정보
class PCPath:
    BASE_DIR = Path(__file__).resolve().parent.parent

    env_path = BASE_DIR / "property.env"

    load_dotenv(env_path)

    def __init__(self, pc_id):
        self.PC_IP = os.getenv(f"{pc_id}_IP")