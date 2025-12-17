# detector.py
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
import base64

from collections import deque
from datetime import datetime


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

        self.frame_count = 0
        self.skip_interval = 3 # 프레임스킵!!!
        # [추가] 초기값 안전장치
        self.last_detections = []
        self.last_danger = 0
        self.last_event = "Safe"

        self.settings_path = settings_path
        self._last_mod_time = 0
        self.reload_settings() # 초기 로드

        self.models = None
        self.track_states = {}
        self.seq_length = 10

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
                        self.settings.update(new_settings)
                    self._last_mod_time = mod_time
            except Exception as e:
                print(f"[Detector] Config Error: {e}")

    def process_frame(self, frame, cam_id):
        # 1. 설정 로드
        self.reload_settings()

        # =========================================================================
        # AI 모드 (프레임 스킵 + 로직 통합)
        # =========================================================================
        if self.models is None: self.models = ai_models.AIModels()

        # 리사이즈
        h_org, w_org = frame.shape[:2]
        new_w = 800
        new_h = int(h_org * (new_w / w_org))
        frame_resized = cv2.resize(frame, (new_w, new_h))
        h, w = frame_resized.shape[:2]

        # 변수 초기화
        self.frame_count += 1

        # 기본값 설정 (스킵할 때 쓸 값들)
        # __init__에 self.last_danger = 0, self.last_event = "Safe" 추가 권장
        # 없다면 여기서 안전장치
        if not hasattr(self, 'last_danger'): self.last_danger = 0
        if not hasattr(self, 'last_event'): self.last_event = "Safe"
        if not hasattr(self, 'last_detections'): self.last_detections = []

        highest_danger_level = self.last_danger
        primary_event_type = self.last_event
        detections = self.last_detections  # 기본적으로 지난번 결과 사용
        screenshot_path = ""

        # ---------------------------------------------------------------------
        # [핵심] 3프레임에 1번만 AI 연산 수행 (나머지는 위에서 설정한 옛날 값 재사용)
        # ---------------------------------------------------------------------
        if self.frame_count % self.skip_interval == 0:
            # 1. YOLO 추론
            results = self.models.predict_yolo(frame_resized)

            # 이번 프레임에서 새로 계산할 임시 변수들
            current_detections = []
            current_danger_max = 0
            current_event_main = "Safe"
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
                            'last_pose': np.zeros((17, 2)),
                            'cooldown': 0,
                            'label': 'Safe'
                        }
                    state = self.track_states[track_id]

                    # 포즈 보정
                    filled_kp = fill_missing_keypoints(kps[:, :2], kps[:, 2], state['last_pose'])
                    state['last_pose'] = filled_kp

                    current_status = "Safe"
                    danger_lvl = 0

                    # (1) 낙상 감지
                    if self.settings['fall_check']:
                        if algorithm.check_fall(box, self.settings.get('fall_ratio', 1.2)):
                            current_status = "Fall"
                            danger_lvl = 3

                    # (2) 구역 감지
                    if self.settings['zone_check'] and danger_lvl < 2:
                        wrists = [filled_kp[9], filled_kp[10]]
                        pixel_range = self.settings.get('reach_ratio', 0.85) * 100
                        formatted_zones = []

                        for z in self.settings['zones']:
                            if isinstance(z, list):
                                formatted_zones.append({'points': z, 'active': True})
                            else:
                                formatted_zones.append(z)

                        zone_res = algorithm.check_zone(wrists, formatted_zones, w, h, warning_px=pixel_range)

                        if zone_res == "Danger":
                            current_status = "THREAT(Zone)"
                            danger_lvl = 2
                            state['cooldown'] = self.settings['lock_duration']
                        elif zone_res == "Warning" and danger_lvl < 1:
                            current_status = "Warning"
                            danger_lvl = 1

                    # (3) AI 행동 인식
                    current_score = 0.0 # 점수 초기화
                    if self.settings['ai_check']:
                        anchor = get_stable_anchor(filled_kp, kps[:, 2])
                        state['buffer'].append((filled_kp - anchor).flatten())

                        if len(state['buffer']) > self.seq_length:
                            input_data = prepare_lstm_input(state['buffer'])
                            probs = self.models.predict_lstm(input_data)
                            if probs is not None:
                                idx = np.argmax(probs)
                                score = float(probs[idx])
                                raw_label = self.models.class_names[idx] if idx < len(self.models.class_names) else "Unknown"

                                # 임계값 상관없이 현제상태 무조건 업데이트(시각화용)
                                state['label'] = raw_label
                                state['score'] = score
                                current_score = score

                                # AI 판단 임계값 적용(설정용)
                                ai_th = self.settings.get('ai_threshold', 0.7)

                                # 신뢰도가 높을때만 위협으로 간주
                                if score > ai_th:
                                    is_danger = (raw_label in self.DANGER_ACTIONS)

                                    if raw_label == 'theft' and self.settings['theft_check']:
                                        is_danger = True
                                    elif raw_label == 'theft':
                                        # 도난감지 껐을 시 라밸표시 처리
                                        state['label'] = "Theft(Ignored)"

                                    if is_danger and danger_lvl < 2:
                                        current_status = "THREAT"
                                        danger_lvl = 2
                                        state['cooldown'] = self.settings['lock_duration']

                    # 쿨다운(Lock) 로직
                    if state['cooldown'] > 0:
                        state['cooldown'] -= 1
                        if danger_lvl < 2:
                            current_status = "THREAT(Locked)"
                            danger_lvl = 2

                    # 최고 위험도 갱신
                    if danger_lvl > current_danger_max:
                        current_danger_max = danger_lvl
                        current_event_main = current_status

                    # 결과 리스트 추가
                    bx1, by1, bx2, by2 = map(int, box[:4])
                    current_detections.append({
                        "id": track_id,
                        "label": state['label'],
                        "status": current_status,
                        "score": state.get('score', 0.0),
                        "danger_level": danger_lvl,
                        "box": [bx1, by1, bx2, by2],
                        "keypoints": filled_kp.tolist()
                    })

            # ID 정리 (사람 사라지면 추적 정보 삭제)
            for k in list(self.track_states.keys()):
                if k not in active_ids: del self.track_states[k]

            # -----------------------------------------------------------------
            # [백업] 계산된 최신 결과를 멤버 변수에 저장 (다음 프레임 재사용용)
            # -----------------------------------------------------------------
            self.last_detections = current_detections
            self.last_danger = current_danger_max
            self.last_event = current_event_main

            # 이번 프레임 결과로 업데이트
            detections = current_detections
            highest_danger_level = current_danger_max
            primary_event_type = current_event_main

        # ---------------------------------------------------------------------
        # [C] 결과 패키징 (이미지 인코딩 제외 -> 바이너리 전송)
        # ---------------------------------------------------------------------
        current_time = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

        # 스크린샷은 위험할 때만 실제 저장
        if highest_danger_level >= 2 and self.frame_count % 30 == 0:  # 1초에 한번만 저장 시도
            filename = f"cam_{cam_id}_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
            save_path = os.path.join(self.CAPTURE_DIR, filename)
            try:
                cv2.imwrite(save_path, frame_resized)
                screenshot_path = f"/captures/{filename}"
            except Exception as e:
                print(f"[Detector] Save Error: {e}")

        event_data = EventJson(
            cam_no=cam_id,
            event_type=primary_event_type,
            danger_level=highest_danger_level,
            event_time=current_time,
            screenshot_path=screenshot_path,
            img_base64="",  # [중요] 바이너리 전송하므로 여기는 비워둠 (속도 향상)
            objects=detections
        )

        return frame_resized, event_data




