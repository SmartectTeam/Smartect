# 행동 감지 모델 탑재 - json 파일로 변환
import cv2


def action_model_video(frame):
    action_json = {
        "is_touch": False,
        "confidence": 0.0
    }
    return action_json


def action_objects():
    result_image = ""
    return result_image