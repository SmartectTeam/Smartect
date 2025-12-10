# 공통 설정
import os
from pathlib import Path
from dotenv import load_dotenv


# 모든 요청에 대해 로그를 남김(미들웨어 클래스)
class LoggingMiddleware:# BaseHTTPMiddleware
    pass


# camera cam ip 정보 .env 파일에서 환경변수 가져오는 class
class WebcamHSYPath:
    BASE_DIR = Path(__file__).resolve().parent.parent

    env_path = BASE_DIR / "property.env"

    load_dotenv(env_path)

    WEBCAM_IP = os.getenv("WEBCAM_IP")
    WEBCAM_PORT = os.getenv("WEBCAM_PORT")
    WEBCAM_ID = os.getenv("WEBCAM_ID")
    WEBCAM_PW = os.getenv("WEBCAM_PW")


# PC2 ip 정보
class PC2Path:
    BASE_DIR = Path(__file__).resolve().parent.parent

    env_path = BASE_DIR / "property.env"

    load_dotenv(env_path)

    PC2_IP = os.getenv("PC2_IP")