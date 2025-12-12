# ip 카메라 연동

# ipcam - mqtt api 활용
# 모스키토 환경설정 변경 "C:\Program Files\mosquitto\mosquitto.conf"
import cv2
from common.config import PhoneCamPath


def phone_connect(cam_id):
    cp = PhoneCamPath(cam_id)

    if cp.WEBCAM_ID == "":
        url = f"http://{cp.WEBCAM_IP}:{cp.WEBCAM_PORT}/video"
    else:
        url = f"http://{cp.WEBCAM_ID}:{cp.WEBCAM_PW}@{cp.WEBCAM_IP}:{cp.WEBCAM_PORT}/video"
    print(f"Webcam 연결중 : {url}")

    cap = cv2.VideoCapture(url)

    if not cap.isOpened():
        print("카메라를 열 수 없습니다.")
        exit()

    return cap


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
            self.cap = phone_connect(source)

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



