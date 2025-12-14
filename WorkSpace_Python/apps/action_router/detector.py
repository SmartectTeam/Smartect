"""
# 모든 판단 , 이미지 저장, 데이터생성 여기서 다 함

apps/
    └── action_router/
        ├── settings/        (설정 JSON 저장소 - 자동생성)
        ├── detect/          (기능 모듈)
        │   ├── __init__.py
        │   ├── processor.py (수학/전처리)
        │   ├── algorithm.py (규칙 감지)
        │   └── ai_models.py (AI 모델)
        ├── camera.py        (영상 입력)
        ├── detector.py      (핵심 로직 & 데이터 생성)
        ├── endpoints.py     (단순 전송)
        └── main.py          (실행)

"""

import cv2
import numpy as np
import json
import os
import time
from collections import deque
from datetime import datetime

from PIL.ImageChops import screen
from tensorflow.python.distribute.test_util import has_thread

from apps.action_router.detect.processor import draw_info
# 공통 모듈
from common.schemas import EventJson
from detect import algorithm, ai_models
from detect.processor import (fill_missing_keypoints, get_stable_anchor, prepare_lstm_input)


class MotionDetector:
    def __init__(self, settings_path=None):
        # 기본 설정 ==================================================================
        self.settings = {
            "fall_check": True,
            "zone_check": True,
            "ai_check": True,
            "theft_check": False,   # 모델 정확도가 높아지면 사용
            "fall_ratio": 1.2,
            "lock_duration": 30,
            "zones": [],
            "detection_mode": "Algorithm",
            "ai_threshold": 0.7
        }

        self.settings_path = settings_path
        self._last_mod_time = 0
        self.reload_settings() # 초기 로드

        self.models = None
        self.track_states = {}
        self.seq_length = 30

        # 위협 행동 리스트
        self.DANGER_ACTIONS = ['punching', 'pushing']

        # 스크린 샷 저장 폴더
        self.CAPTURE_DIR = "static/captures" # =======================================
        os.makedirs(self.CAPTURE_DIR, exist_ok=True)

    def reload_settings(self):
        # 파일 변경 시 설정 다시 읽기
        if self.settings_path and os.path.exists(self.settings_path):
            try:
                mod_time = os.path.getmtime(self.settings_path)
                if mod_time > self._last_mod_time:
                    with open(self.settings_path, 'r', encoding='utf-8') as f:
                        new_settings = json.load(f)
                        self.setting.update(new_settings)
                    self._last_mod_time = mod_time
            except Exception as e:
                print(f"[Detector] Config Error: {e}")

    def process_frame(self, frame, cam_id):
        # 프레임을 분석하고 전송할 데이터 객체를 생성 (Endpoints 에서 이 함수를 호출)
        self.reload_settings()
        if self.models is None: self.models = ai_models.AIModels()

        # 리사이즈
        frame_resized = cv2.resize(frame, (800, 600))
        annotated_frame = frame_resized.copy()
        h, w = frame_resized.shape[:2]

        # YOLO 추론
        results = self.models.predict_yolo(frame_resized)

        # 대표 상대값 (가장 위험한 상황 전송)
        highest_danger_level = 0
        primary_event_type = "Safe"
        active_ids = []

        if results and results[0].boxes is not None:
            boxes = results[0].boxes.data.cpu().numpy()
            kps_data = results[0].keypoints.data.cpu().numpy()

            for box, kps in zip(boxes, kps_data):
                track_id = int(box[4])
                active_ids.append(track_id)

                if track_id not in self.track_states:
                    self.track_states[track_id] = {
                        'buffer': deque(maxlen=self.seq_length),
                        'last_pose': np.zeros((17,2)),
                        'cooldown': 0,
                        'label': 'Safe'
                    }
                state = self.track_states[track_id]

                # 로직 수행
                filled_kp = fill_missing_keypoints(kps[:,:2], kps[:,2], state['last_pose'])
                state['last_pose'] = filled_kp

                current_status = "Safe"
                danger_lvl = 0 # 0: safe, 1: warning, 2: threat, 3: fall
                box_color = (0, 255, 0)

                # 낙상
                if self.settings['fall_check']:
                    if algorithm.check_fall(box, self.settings['fall_ratio']):
                        current_status = "Fall"
                        danger_lvl = 3
                        box_color = (255, 0, 255)

                # 구역
                if self.settings['zone_check'] and danger_lvl < 2:
                    wrists = [filled_kp[9], filled_kp[10]]
                    zone_res = algorithm.check_zone(wrists, self.settings['zones'], w, h)
                    if zone_res == "Danger":
                        current_status = "THREAT(Zone)"
                        danger_lvl = 2
                        state['cooldown'] = self.settings['lock_duration']
                    elif zone_res == "Warning" and danger_lvl < 1:
                        current_status = "Warning"
                        danger_lvl = 1

                # AI 행동
                if self.settings['ai_check']:
                    anchor = get_stable_anchor(filled_kp, kps[:,2])
                    state['buffer'].append((filled_kp - anchor).flatten())

                    if len(state['buffer']) > self.seq_length:
                        input_data = prepare_lstm_input(state['buffer'])
                        probs = self.models.predict_lstm(input_data)

                        if probs is not None:
                            idx = np.argmax(probs)
                            score = probs[idx]
                            ai_th = self.settings.get('ai_threshold', 0.7)

                            if score > ai_th:
                                label = self.models.class_names[idx] if idx < len(self.models.class_names) else "Unknown"
                                state['label'] = label

                                is_danger = (label in self.DANGER_ACTIONS)
                                if label == 'theft' and self.settings['theft_check']:
                                    is_danger = True
                                elif label == 'theft':
                                    state['label'] = "Theft(Ignored)"

                                if is_danger and danger_lvl < 2:
                                    current_status = "THREAT"
                                    danger_lvl = 2
                                    state['cooldown'] = self.settings['lock_duration']

                # Lock
                if state['cooldown'] > 0:
                    state['cooldown'] -= 1
                    if danger_lvl < 2:
                        current_status = "THREAT(Locked)"
                        dnager_lvl = 2
                        box_color = (0, 0, 255)

                if danger_lvl == 1: box_color = (0, 255, 255)
                elif danger_lvl >= 2: box_color = (0, 0, 255)

                # 대표 상태 갱신
                if danger_lvl > highest_danger_level:
                    highest_danger_level = danger_lvl
                    primary_event_type = current_status

                draw_info(annotated_frame, box, filled_kp, box_color, f"{track_id}: {state['label']}|{current_status}")

        # ID 정리
        for k in list(self.track_states.keys()):
            if k not in active_ids: del self.track_states[k]

        # ========================================================
        # [결과 생성] endpoint로 보낼 데이터 패키징
        # ========================================================
        current_time = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        has_thread = (highest_danger_level >= 2)
        screenshot_path = ""

        # 스크린샷 저장
        if has_thread:
            filename = f"cam_{cam_id}_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
            save_path = os.path.join(self.CAPTURE_DIR, filename)
            try:
                cv2.imwrite(save_path, annotated_frame)
                screenshot_path = f"/captures/{filename}"
            except Exception as e:
                print(f"[Detector] Save Error: {e}")

        # Pydantic 모델 생성
        event_data = EventJson(
            cam_no=cam_id,
            event_type=primary_event_type,
            danger_level=highest_danger_level,
            event_time=current_time,
            screenshot_path=screenshot_path,
        )
        return annotated_frame, event_data




