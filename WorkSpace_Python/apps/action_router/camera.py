# ip 카메라 연동

# ipcam - mqtt api 활용
# 모스키토 환경설정 변경 "C:\Program Files\mosquitto\mosquitto.conf"
import cv2
from common.config import CamPath


def cam_connect(cam_id):
    cp = CamPath(cam_id)

    port = cp.WEBCAM_PORT if cp.WEBCAM_PORT else "554"
    
    if not cp.WEBCAM_IP:
        print("환경변수가 설정되지 않았습니다.")
        exit(1)

    rtsp_paths = [
        "/stream_ch01_0",      # 일반적인 경로
        "/h264",               # 일부 카메라
        "/live",               # 일부 카메라
        "/cam/realmonitor",    # 일부 카메라
        "/",                   # 루트 경로
    ]

    # 인증 정보에 따른 URL
    def make_url(path):
        if not cp.WEBCAM_ID or cp.WEBCAM_ID == "":
            return f"rtsp://{cp.WEBCAM_IP}:{port}{path}"
        else:
            return f"rtsp://{cp.WEBCAM_ID}:{cp.WEBCAM_PW}@{cp.WEBCAM_IP}:{port}{path}"

    for path in rtsp_paths:
        url = make_url(path)
        print(f"[DEBUG] 연결 시도: {url}")
        
        try:
            cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
            cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)

            import time
            time.sleep(1)
            
            if cap.isOpened():
                ret, frame = cap.read()
                if ret:
                    return cap
                else:
                    cap.release()
            else:
                cap.release()
        except Exception as e:
            continue

    exit(1)

def snap_cam_connect(video_path):
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        print("카메라를 열 수 없습니다.")
        exit()

    return cap

def camera_disconnect(cap):
    cap.release()
    cv2.destroyAllWindows()
    return "cap, cv2 종료 되었습니다."


# =======================
# HSM 임시 카메라 기존함수 활용
# =======================
class WebcamStream:
    """
    실시간 카메라용 클래스
    - cam_id가 0, 1 같은 숫자면: snap_cam_connect(로컬캠) 사용
    - cam_id가 문자열(ID)이면: phone_connect(IP캠) 사용
    """
    def __init__(self, source):
        if isinstance(source, int):
            self.cap = snap_cam_connect(source)
        else:
            self.cap = cam_connect(source)

    def read(self):
        return self.cap.read()

    def release(self):
        camera_disconnect(self.cap)


class FileLoofStream:
    """
    파일재생 무한반복용 클래스
     - 기존 snap_cam_connect를 사용하며 열고 e
        read() 할때 영상이 끝나면 되감기 기능 추가
    """
    def __init__(self, file_path):
        self.cap = snap_cam_connect(file_path)
        self.file_path = file_path

    def read(self):
        ret, frame = self.cap.read()

        # 영상 끝 도달 시 되감지 로직
        if not ret:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self.cap.read()

        return ret, frame

    def release(self):
        camera_disconnect(self.cap)



