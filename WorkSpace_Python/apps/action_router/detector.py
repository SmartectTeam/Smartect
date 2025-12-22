# apps/action_router/detector.py
"""
# 모든 판단 , 이미지 저장, 데이터생성 여기서 다 함
# 수정사항:
# 1. 0.1초(10FPS) 단위 시간 동기화 적용
# 2. 감지 누락 시 Zero Padding 적용 (데이터 끊김 방지)
# 3. 30프레임 시퀀스, 속도/가속도 특징 사용
"""

import cv2
import numpy as np
import json
import os
import time  # [추가] 시간 측정을 위해 필요

from collections import deque
from datetime import datetime

# 공통 모듈
from common.schemas import EventJson, EventMap
from detect import algorithm, ai_models
from detect.processor import (fill_missing_keypoints, get_stable_anchor)


class MotionDetector:
    def __init__(self, settings_path=None):
        # 기본 설정
        self.settings = {
            "detection_mode": "mix",
            "fall_check": True,
            "zone_check": True,
            "ai_check": True,
            "theft_check": False,
            "fall_ratio": 1.2,
            "lock_duration": 30,
            "zones": [],
            "ai_threshold": 0.7,
            "hip_ratio": 0.2,
            "reach_ratio": 0.85
        }

        # [수정 1] 프레임 카운트 방식 제거 -> 시간 기반 설정 추가
        self.last_sampling_time = 0
        self.target_interval = 0.1  # 10 FPS (0.1초 간격)

        # 안전장치 초기화
        self.last_detections = []
        self.last_danger = 0
        self.last_event = "Safe"

        self.settings_path = settings_path
        self._last_mod_time = 0
        self.reload_settings()

        self.models = None
        self.track_states = {}

        self.seq_length = 30  # 학습 모델과 동일하게 30

        self.DANGER_ACTIONS = ['punching', 'pushing']

        self.CAPTURE_DIR = "static/captures"
        os.makedirs(self.CAPTURE_DIR, exist_ok=True)

    def reload_settings(self):
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

    def _prepare_lstm_features(self, buffer):
        """
        [학습 코드와 동일한 특징 추출 함수]
        """
        pos_seq = np.array(buffer)  # (30, 34)
        vel_seq = np.diff(pos_seq, axis=0)
        vel_seq = np.pad(vel_seq, ((1, 0), (0, 0)), 'constant')
        acc_seq = np.diff(vel_seq, axis=0)
        acc_seq = np.pad(acc_seq, ((1, 0), (0, 0)), 'constant')
        full_feature = np.concatenate((pos_seq, vel_seq, acc_seq), axis=1)  # (30, 102)
        return np.expand_dims(full_feature, axis=0)

    def process_frame(self, frame, cam_id):
        # 1. 설정 로드
        self.reload_settings()

        if self.models is None: self.models = ai_models.AIModels()

        # [주의] Resize는 건드리지 않음 (endpoints.py에서 640px로 처리되어 옴)
        h, w = frame.shape[:2]

        # 안전장치
        if not hasattr(self, 'last_danger'): self.last_danger = 0
        if not hasattr(self, 'last_event'): self.last_event = "Safe"
        if not hasattr(self, 'last_detections'): self.last_detections = []

        highest_danger_level = self.last_danger
        primary_event_type = self.last_event
        detections = self.last_detections
        screenshot_path = ""

        current_time = time.time()

        # ---------------------------------------------------------------------
        # [핵심 수정 1] 시간 기반 샘플링 (0.1초 마다 실행)
        # ---------------------------------------------------------------------
        if current_time - self.last_sampling_time >= self.target_interval:
            self.last_sampling_time = current_time

            # YOLO 추론
            results = self.models.predict_yolo(frame)

            current_detections = []
            current_danger_max = 0
            current_event_main = "Safe"

            # 이번 프레임에서 감지된 ID 목록
            active_ids_this_frame = set()

            # --- [A] 감지된 객체 처리 ---
            if results and results[0].boxes is not None:
                boxes = results[0].boxes.data.cpu().numpy()
                kps_data = results[0].keypoints.data.cpu().numpy()

                for box, kps in zip(boxes, kps_data):
                    track_id = int(box[4])
                    active_ids_this_frame.add(track_id)

                    # 신규 ID 초기화
                    if track_id not in self.track_states:
                        self.track_states[track_id] = {
                            'buffer': deque(maxlen=self.seq_length),
                            'last_pose': np.zeros((17, 2)),
                            'cooldown': 0,
                            'label': 'Safe',
                            'score': 0.0,
                            'missing_count': 0  # [추가] 사라진 기간 카운트
                        }
                    state = self.track_states[track_id]
                    state['missing_count'] = 0  # 감지되었으므로 카운트 초기화

                    mode = self.settings.get('detection_mode', 'mix')

                    # 포즈 보정
                    filled_kp = fill_missing_keypoints(kps[:, :2], kps[:, 2], state['last_pose'])
                    state['last_pose'] = filled_kp

                    current_status = "Safe"
                    danger_lvl = 0

                    # (1) & (2) 알고리즘 감지
                    if mode in ['algorithm', 'mix']:
                        if self.settings['fall_check']:
                            if algorithm.check_fall(box, self.settings.get('fall_ratio', 1.2)):
                                current_status = "Fall"
                                danger_lvl = 3

                        if self.settings['zone_check'] and danger_lvl < 2:
                            shoulder_y = (filled_kp[5][1] + filled_kp[6][1]) / 2
                            hip_y = (filled_kp[11][1] + filled_kp[12][1]) / 2
                            torso_height = abs(hip_y - shoulder_y)
                            if torso_height < 1: torso_height = 1

                            user_hip_ratio = self.settings.get('hip_ratio', 0.2)
                            limit_y = hip_y - (torso_height * user_hip_ratio)

                            valid_wrists = []
                            for w_idx in [9, 10]:
                                wx, wy = filled_kp[w_idx]
                                if wx > 0 and wy > 0 and wy < limit_y:
                                    valid_wrists.append((wx, wy))

                            if valid_wrists:
                                reach_ratio = self.settings.get('reach_ratio', 0.85)
                                dynamic_warning_px = torso_height * reach_ratio

                                formatted_zones = []
                                for z in self.settings['zones']:
                                    if isinstance(z, list):
                                        formatted_zones.append({'points': z, 'active': True, 'scale': 1.0})
                                    else:
                                        if 'scale' not in z: z['scale'] = 1.0
                                        formatted_zones.append(z)

                                zone_res = algorithm.check_zone(valid_wrists, formatted_zones, w, h,
                                                                warning_px=dynamic_warning_px)

                                if zone_res == "Danger":
                                    current_status = "THREAT(Zone)"
                                    danger_lvl = 2
                                    state['cooldown'] = self.settings['lock_duration']
                                elif zone_res == "Warning" and danger_lvl < 1:
                                    current_status = "Warning"
                                    danger_lvl = 1

                    # (3) AI 데이터 준비 (정규화 및 버퍼 추가)
                    if mode in ['ai', 'mix']:
                        anchor = get_stable_anchor(filled_kp, kps[:, 2])
                        if anchor is None:
                            anchor = np.array([(box[0] + box[2]) / 2, (box[1] + box[3]) / 2])

                        box_h = box[3] - box[1]
                        scale_factor = max(box_h, 1.0)
                        norm_kp = (filled_kp - anchor) / scale_factor

                        # [데이터 추가] 정상 데이터 추가
                        state['buffer'].append(norm_kp.flatten())

                    # 결과 임시 저장 (AI 예측은 버퍼 체크 후 일괄 처리)
                    bx1, by1, bx2, by2 = map(int, box[:4])

                    # 아직 AI 예측 전이므로 이전 상태나 Safe 유지
                    current_detections.append({
                        "id": track_id,
                        "label": state.get('label', 'Safe'),
                        "status": current_status,
                        "score": state.get('score', 0.0),
                        "danger_level": danger_lvl,
                        "box": [bx1, by1, bx2, by2],
                        "ptr_state": state  # 참조용
                    })

                    if danger_lvl > current_danger_max:
                        current_danger_max = danger_lvl
                        current_event_main = current_status

            # --- [B] 놓친 객체 처리 (Zero Padding) ---
            # [핵심 수정 2] 감지되지 않은 ID에 대해 Zero Data를 넣어 끊김 방지
            for track_id in list(self.track_states.keys()):
                if track_id not in active_ids_this_frame:
                    state = self.track_states[track_id]
                    mode = self.settings.get('detection_mode', 'mix')

                    if mode in ['ai', 'mix']:
                        # [데이터 추가] 0으로 채운 데이터 추가 (속도/가속도 튐 방지)
                        state['buffer'].append(np.zeros(34))

                    state['missing_count'] += 1

                    # 30프레임(약 3초) 이상 사라지면 추적 삭제
                    if state['missing_count'] > 30:
                        del self.track_states[track_id]

            # --- [C] AI 예측 실행 (버퍼가 찬 모든 객체 대상) ---
            for det in current_detections:
                state = det['ptr_state']

                # 버퍼가 30개 찼는지 확인
                if len(state['buffer']) == self.seq_length:
                    input_data = self._prepare_lstm_features(state['buffer'])
                    probs = self.models.predict_lstm(input_data)

                    if probs is not None:
                        idx = np.argmax(probs)
                        score = float(probs[idx])
                        raw_label = self.models.class_names[idx] if idx < len(self.models.class_names) else "Unknown"

                        state['label'] = raw_label
                        state['score'] = score

                        # 결과 업데이트
                        det['label'] = raw_label
                        det['score'] = score

                        ai_th = self.settings.get('ai_threshold', 0.7)
                        if score > ai_th:
                            # 상태 덮어쓰기 (Safe -> Punching 등)
                            # 단, 알고리즘으로 이미 위험(Fall, Zone) 판정이 났으면 유지 고려
                            # 여기서는 AI 라벨을 우선시하되 위험도 체크

                            is_danger = False
                            if raw_label in self.DANGER_ACTIONS: is_danger = True
                            if raw_label == 'theft' and self.settings['theft_check']:
                                is_danger = True
                            elif raw_label == 'reaching':
                                # Reaching은 구역체크가 필요하지만,
                                # 여기서 좌표 다시 꺼내기 복잡하므로
                                # 위쪽 알고리즘 단계의 zone_res 결과를 활용하는게 좋음.
                                # 이미 위에서 current_status가 THREAT(Zone)이면 건들지 않음
                                if det['status'] == 'THREAT(Zone)':
                                    is_danger = True
                                    raw_label = "reaching(Zone)"

                            # AI 판단 업데이트
                            det['status'] = raw_label

                            if is_danger and det['danger_level'] < 2:
                                det['danger_level'] = 2
                                state['cooldown'] = self.settings['lock_duration']

                # 쿨다운 적용
                if state['cooldown'] > 0:
                    state['cooldown'] -= 1
                    if det['danger_level'] < 2:
                        det['status'] = "THREAT(Locked)"
                        det['danger_level'] = 2

                # 최고 위험도 재갱신 (AI 결과 반영 후)
                if det['danger_level'] > current_danger_max:
                    current_danger_max = det['danger_level']
                    current_event_main = det['status']

                # 참조 객체 제거 (JSON 직렬화 위해)
                del det['ptr_state']

            # 백업
            self.last_detections = current_detections
            self.last_danger = current_danger_max
            self.last_event = current_event_main

            detections = current_detections
            highest_danger_level = current_danger_max
            primary_event_type = current_event_main

        # ---------------------------------------------------------------------
        # [C] 결과 패키징
        # ---------------------------------------------------------------------
        current_time_str = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        action_json = []
        action_map = []

        if detections:
            for det in detections:
                action_json.append(EventJson(
                    cam_no=cam_id,
                    event_type=det['status'],
                    danger_level=det['danger_level'],
                    event_time=current_time_str,
                    screenshot_path=screenshot_path,
                ))
                action_map.append(EventMap(
                    x1=det['box'][0],
                    y1=det['box'][1],
                    x2=det['box'][2],
                    y2=det['box'][3],
                    event_type=det['status'],
                    confidence=det['score']
                ))

        return action_json, action_map