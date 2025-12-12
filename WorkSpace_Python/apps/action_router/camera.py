# ip 카메라 연동

# ipcam - mqtt api 활용
# 모스키토 환경설정 변경 "C:\Program Files\mosquitto\mosquitto.conf"
import cv2
from common.config import PhoneCamPath

def cam_connect(cam_id):
    cp = PhoneCamPath(cam_id)

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