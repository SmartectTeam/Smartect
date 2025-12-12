import numpy as np
import cv2

# ==========================================
# [데이터 전처리] LSTM 모델 입력용 데이터 가공
# ==========================================

def fill_missing_keypoints(current_kp, confs, last_valid_kp):
    # 신뢰도가 낮은 관절 좌표를 이전 프레임의 값으로 채움
    filled = current_kp.copy()
    if last_valid_kp is None:
        return filled

    for i in range(17):
        # 신뢰도가 0.5 미만이거나 좌표가 0.0 인 경우 보정
        if confs[i] < 0.5 or (filled[i][0] == 0 and filled[i][1] == 0):
            filled[i] = last_valid_kp[i]
    return filled

def get_stable_anchor(kp, confs):
    # 정규화를 위한 기준점 선정: 어깨 -> 골반 -> 코
    if confs[5] > 0.5 and confs[6] > 0.5: return (kp[5] + kp[6]) / 2
    if confs[11] > 0.5 and confs[12] > 0.5: return (kp[11] + kp[12]) / 2
    if confs[0] > 0.5: return kp[0]
    return np.array([0,0])

def prepare_lstm_input(buffer):
    # 30프레임의 버퍼 데이터를 lstm 모델입력 형태로 변환
    pos_seq = np.array(buffer)          # 위치
    vel_seq = np.diff(pos_seq, axis=0)  # 속도
    acc_seq = np.diff(vel_seq, axis=1)  # 가속도

    # 차원유지 제로 패딩
    vel_seq = np.pad(vel_seq, ((1, 0), (0, 0)), 'constant')
    acc_seq = np.pad(acc_seq, ((2, 0), (0, 0)), 'constant')

    # Feature 결합
    features = np.concatenate((pos_seq, vel_seq, acc_seq), axis=1)
    return np.expand_dims(features, axis=0)

# ============================
# [시각화] 화면에 박스와 텍스트 그리기
# ============================
def draw_info(img, box, kps, color, label):
    # 박스 그리기
    bx1, by1, bx2, bt2 = map(int, box[:4])
    cv2.rectangle(img, (bx1, by1), (bx2, bt2), color, 2)

    # 텍스트 배경
    (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
    cv2.rectangle(img, (bx1, by1 - 20), (bx1 + w, by1), color, -1)

    # 라벨 쓰기
    cv2.putText(img, label, (bx1, by1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    # 관절 점 찍기
    for x, y in kps:
        cv2.circle(img, (int(x), int(y)), 3, color, -1)





