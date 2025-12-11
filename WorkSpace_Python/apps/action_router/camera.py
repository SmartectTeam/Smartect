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