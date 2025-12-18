import numpy as np
import cv2

def check_fall(box, ratio_th=1.2):
    # 낙상감지 : 박스의 가로가 세로보다 일정비율(ratio_th)이상 길면 넘어짐 판정
    bx1, by1, bx2, by2 = map(int, box[:4])
    width = abs(bx2 - bx1)
    height = abs(by2 - by1)

    if height == 0: return False
    return width > (height * ratio_th)


def check_zone(wrist_coords, zones, width, height, warning_px=30):
    # 위험구역 침입 감지
    status = "Safe"

    for zone in zones:
        if not zone.get('active', True): continue

        # [수정] 개별 구역의 scale 적용 (기본값 1.0)
        scale = zone.get('scale', 1.0)

        # 경고 범위에 스케일 곱하기 (슬라이더 0~5배 적용)
        current_warning_dist = warning_px * scale

        # 정규화 좌표 -> 픽셀 좌표 변환
        pts = np.array(zone['points']) * [width, height]
        pts = pts.astype(np.int32)

        for wx, wy in wrist_coords:
            # 거리 계산 (+:내부, -:외부)
            dist = cv2.pointPolygonTest(pts, (wx, wy), True)

            if dist >= 0:
                return "Danger"  # 구역 내부 침입

            # [수정] 확장된 범위(음수 거리) 내에 있는지 확인
            # dist가 -30이고 current_warning이 50이면 (-30 >= -50) True -> Warning
            elif dist >= -current_warning_dist:
                status = "Warning"

    return status
