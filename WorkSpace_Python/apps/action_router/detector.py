# apps/action_router/detector.py

import numpy as np
import json
import time
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

        # 시간 기반 설정
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

    def reload_settings(self):
        if self.settings_path and self.settings_path.exists():
            try:
                mod_time = self.settings_path.stat().st_mtime

                if mod_time > self._last_mod_time:
                    with self.settings_path.open('r', encoding='utf-8') as f:
                        new_settings = json.load(f)

                        # [추가됨] 모드가 변경되었는지 확인
                        old_mode = self.settings.get('detection_mode')
                        new_mode = new_settings.get('detection_mode')

                        # 설정 업데이트
                        self.settings.update(new_settings)

                        # [추가됨] 모드가 바뀌었다면 메모리 초기화 (이전 데이터 삭제)
                        if old_mode != new_mode:
                            print(f">>> [System] Mode Changed: {old_mode} -> {new_mode}. Resetting states.")
                            self.track_states.clear()  # 객체 추적 정보/버퍼 초기화
                            self.last_detections = []  # 화면에 표시되는 박스 초기화
                            self.last_danger = 0  # 위험도 초기화
                            self.last_event = "Safe"  # 이벤트 상태 초기화

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

        h, w = frame.shape[:2]

        # 안전장치
        if not hasattr(self, 'last_danger'): self.last_danger = 0
        if not hasattr(self, 'last_event'): self.last_event = "Safe"
        if not hasattr(self, 'last_detections'): self.last_detections = []

        detections = self.last_detections

        current_time = time.time()

        # ---------------------------------------------------------------------
        # 시간 기반 샘플링 (0.1초 마다 실행)
        # ---------------------------------------------------------------------
        if current_time - self.last_sampling_time >= self.target_interval:
            self.last_sampling_time = current_time

            # YOLO 추론 (좌표 확보를 위해 항상 실행됨)
            results = self.models.predict_yolo(frame)

            current_detections = []
            current_danger_max = 0
            current_event_main = "Safe"

            # 이번 프레임에서 감지된 ID 목록
            active_ids_this_frame = set()

            # 현재 모드 가져오기 ('mix', 'algorithm', 'ai')
            current_mode = self.settings.get('detection_mode', 'mix')

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
                            'missing_count': 0,
                            'trigger_count': 0  # <--- ★ [추가] 연속 감지 카운터

                        }
                    state = self.track_states[track_id]
                    state['missing_count'] = 0

                    # 포즈 보정
                    filled_kp = fill_missing_keypoints(kps[:, :2], kps[:, 2], state['last_pose'])
                    state['last_pose'] = filled_kp

                    current_status = "Safe"
                    danger_lvl = 0

                    # (1) & (2) 알고리즘 감지 (algorithm 또는 mix 모드일 때만)
                    if current_mode in ['algorithm', 'mix']:
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

                            zone_res = None
                            if valid_wrists:
                                reach_ratio = self.settings.get('reach_ratio', 0.85)
                                dynamic_warning_px = torso_height * reach_ratio

                                formatted_zones = []
                                for z in self.settings['zones']:
                                    if isinstance(z, list):
                                        formatted_zones.append({'points': z, 'active': True, 'scale': 1.0})
                                    else:
                                        z_copy = z.copy()

                                        if 'scale' not in z_copy:
                                            z_copy['scale'] = 1.0

                                        formatted_zones.append(z_copy)

                                    zone_res = algorithm.check_zone(valid_wrists, formatted_zones, w, h,
                                                                    warning_px=dynamic_warning_px)

                                if zone_res == "Danger":
                                    current_status = "THREAT(Zone)"
                                    danger_lvl = 2
                                    state['cooldown'] = self.settings['lock_duration']
                                elif zone_res == "Warning" and danger_lvl < 1:
                                    current_status = "Warning"
                                    danger_lvl = 1

                    # =========================================================
                    # ★ [추가] 튀는 데이터 방지 (지속성 검사)
                    # =========================================================
                    # 1. 이번 프레임이 위험한가?
                    is_dangerous_now = (current_status != "Safe") or (danger_lvl > 0)

                    # 2. 연속 카운트 증가/초기화
                    if is_dangerous_now:
                        state['trigger_count'] += 1
                    else:
                        # 안전하면 즉시 카운트 초기화 (혹은 천천히 줄여도 됨)
                        state['trigger_count'] = 0

                    # 3. "3프레임(약 0.3초)" 연속 감지 안됐으면 무시 (숫자 조절 가능)
                    # (Lock이 걸린 상태면 무시하지 않음)
                    if state['trigger_count'] < 3 and state['cooldown'] == 0:
                        current_status = "Safe"
                        danger_lvl = 0
                    # =========================================================

                    # (3) AI 데이터 준비 (데이터 수집은 ai 또는 mix 모드일 때만)
                    if current_mode in ['ai', 'mix']:
                        anchor = get_stable_anchor(filled_kp, kps[:, 2])
                        if anchor is None:
                            anchor = np.array([(box[0] + box[2]) / 2, (box[1] + box[3]) / 2])

                        box_h = box[3] - box[1]
                        scale_factor = max(box_h, 1.0)
                        norm_kp = (filled_kp - anchor) / scale_factor

                        # 정상 데이터 추가
                        state['buffer'].append(norm_kp.flatten())
                    else:
                        # 알고리즘 모드면 버퍼를 비우거나 채우지 않음 (선택사항, 여기선 유지)
                        pass




                    # 결과 임시 저장
                    bx1, by1, bx2, by2 = map(int, box[:4])

                    current_detections.append({
                        "id": track_id,
                        "label": state.get('label', 'Safe'),
                        "status": current_status,
                        "score": state.get('score', 0.0),
                        "danger_level": danger_lvl,
                        "box": [bx1, by1, bx2, by2],
                        "ptr_state": state
                    })

                    if danger_lvl > current_danger_max:
                        current_danger_max = danger_lvl
                        current_event_main = current_status

            # --- [B] 놓친 객체 처리 (Zero Padding) ---
            for track_id in list(self.track_states.keys()):
                if track_id not in active_ids_this_frame:
                    state = self.track_states[track_id]

                    # AI나 Mix 모드일 때만 빈 데이터를 채움
                    if current_mode in ['ai', 'mix']:
                        state['buffer'].append(np.zeros(34))

                    state['missing_count'] += 1

                    if state['missing_count'] > 30:
                        del self.track_states[track_id]

            # --- [C] AI 예측 실행 (버퍼가 찬 모든 객체 대상) ---
            for det in current_detections:
                state = det['ptr_state']

                # [중요 수정] 모드가 'ai' 또는 'mix'일 때만 LSTM 예측 수행
                if current_mode in ['ai', 'mix'] and len(state['buffer']) == self.seq_length:
                    input_data = self._prepare_lstm_features(state['buffer'])
                    probs = self.models.predict_lstm(input_data)

                    if probs is not None:
                        idx = np.argmax(probs)
                        score = float(probs[idx])
                        raw_label = self.models.class_names[idx] if idx < len(self.models.class_names) else "Unknown"

                        state['label'] = raw_label
                        state['score'] = score

                        det['label'] = raw_label
                        det['score'] = score

                        ai_th = self.settings.get('ai_threshold', 0.7)
                        if score > ai_th:
                            is_danger = False
                            if raw_label in self.DANGER_ACTIONS: is_danger = True
                            if raw_label == 'theft' and self.settings['theft_check']:
                                is_danger = True
                            elif raw_label == 'reaching':
                                if det['status'] == 'THREAT(Zone)':
                                    is_danger = True
                                    raw_label = "reaching(Zone)"

                            # AI 판단 업데이트
                            det['status'] = raw_label

                            if is_danger and det['danger_level'] < 2:
                                det['danger_level'] = 2
                                state['cooldown'] = self.settings['lock_duration']

                # 쿨다운 적용 (AI 예측 여부와 상관없이 동작해야 함)
                if state['cooldown'] > 0:
                    state['cooldown'] -= 1
                    if det['danger_level'] < 2:
                        det['status'] = "THREAT(Locked)"
                        det['danger_level'] = 2

                # 최고 위험도 재갱신
                if det['danger_level'] > current_danger_max:
                    current_danger_max = det['danger_level']
                    current_event_main = det['status']

                del det['ptr_state']

            self.last_detections = current_detections
            self.last_danger = current_danger_max
            self.last_event = current_event_main

            detections = current_detections

        # ---------------------------------------------------------------------
        # [C] 결과 패키징
        # ---------------------------------------------------------------------
        current_time_str = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        action_json = []
        action_map = []

        if detections:
            for det in detections:

                # [중요] Unknown 상태는 전송하지 않고 건너뜀
                if det['status'] == "Unknown":
                    continue

                action_json.append(EventJson(
                    cam_no=cam_id,
                    event_type=det['status'],
                    danger_level=det['danger_level'],
                    event_time=current_time_str,
                    screenshot_path="",
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