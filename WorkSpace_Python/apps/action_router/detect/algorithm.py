import numpy as np
import cv2

def check_fall(box, ratio_th=1.2):
    # 낙상감지 : 박스의 가로가 세로보다 일정비율(ratio_th)이상 길면 넘어짐 판정
    bx1, by1, bx2, by2 = map(int, box[:4])
    width = abs(bx2 - bx1)
    height = abs(by2 - by1)

    if height == 0: return False
    return width > (height * ratio_th)

def check_zone(wrist_coords, zones, width, height):
    # 위험구역 침입 감지
    status = "Safe"

    for zone in zones:
        if not zone.get('active', True): continue

        # 정규화 좌표를 화면 픽셀 좌표로 변환
        pts = np.array(zone['points']) * [width, height]
        pts = pts.astype(np.int32)

        for wx, wy in wrist_coords:
            # 점과 다각형 사이의 거리 계산(+:내부, -:외부, 0: 경계)
            dist = cv2.pointPolygonTest(pts, (wx, wy), True)

            if dist >= 0:
                return "Danger"
            elif dist >= -30: # 경계선 30픽셀 이내 접근 시 경고
                status = "Warning"

    return status



