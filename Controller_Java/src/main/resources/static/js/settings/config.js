/**
 * config.js
 * 전역 상태 및 상수 관리
 */

// ⭐ 포트를 동적으로 가져오기 (현재 접속한 포트 사용)
const BACKEND_HOST = '192.168.0.166';
const BACKEND_PORT = '8000';

export const CONSTANTS = {
    WS_URL: `ws://${BACKEND_HOST}:${BACKEND_PORT}/ws/output`,
    API_GET: `http://${BACKEND_HOST}:${BACKEND_PORT}/settings/get`,
    API_UPDATE: `http://${BACKEND_HOST}:${BACKEND_PORT}/settings/update`,
    API_PREVIEW: `http://${BACKEND_HOST}:${BACKEND_PORT}/settings/preview`,
    API_DISCARD: `http://${BACKEND_HOST}:${BACKEND_PORT}/settings/discard`
};

console.log("[CONSTANTS] Backend:", `${BACKEND_HOST}:${BACKEND_PORT}`);
console.log("[CONSTANTS] Frontend:", `${window.location.hostname}:${window.location.port}`);
console.log("[CONSTANTS] API_GET:", CONSTANTS.API_GET);

export const STATE = {
    currentCamId: 1,
    isConnected: false,

    // UI 상태 (탭, 드래그 등)
    ui: {
        activeTab: 'GENERAL', // 'GENERAL' | 'ZONE'

        // 드래그 관련
        isDragging: false,
        dragTargetIndex: -1, // 몇 번째 구역을 잡고 있는지
        dragStartPos: {x:0, y:0},

        // 그리기 관련
        drawPoints: [],       // 현재 찍고 있는 점들 (최대 3개)

        // 그리기 모드 상태
        isDrawingMode: false
    },

    // 서버 설정값 (기본값)
    settings: {
        fall_check: true,
        zone_check: true,
        ai_check: true,
        fall_ratio: 1.2,
        reach_ratio: 0.85, // 접근 범위(사용안함, zone별 scale사용)
        hip_ratio: 0.2,
        ai_threshold: 0.7,
        lock_duration: 30,

        // 구역 데이터: [ {points: [[x,y],...], scale: 1.5}, ... ]
        zones: [],

        vis_bbox: true,
        vis_text: true
    },

    // [핵심] 한글 상태 매핑 및 색상 정의
    statusMap: {
        // 1. 기본 시스템 상태
        "Safe":             { text: "안전",    color: "#00FF00" }, // 초록
        "Warning":          { text: "경고",    color: "#FFFF00" }, // 노랑
        "Danger":           { text: "위험",    color: "#FF0000" }, // 빨강

        // 2. 알고리즘 감지
        "Fall":             { text: "낙상",    color: "#FF0000" },
        "THREAT(Zone)":     { text: "구역침입", color: "#FF0000" },
        "THREAT(Locked)":   { text: "위험(잠금)", color: "#FF0000" },

        // 3. AI 행동 인식 (영어 -> 한글 변환)
        // [위험 그룹]
        "punching":         { text: "폭행",    color: "#FF0000" }, // 빨강
        "pushing":          { text: "밀침",    color: "#FF0000" }, // 빨강
        "reaching":         { text: "손뻗음(침입)",  color: "#FF0000" },

        // [안전/일상 그룹] - 색상을 초록이나 파랑 계열로 해서 구분
        "walking":          { text: "걷기",    color: "#00FF00" }, // 초록
        "standing":         { text: "서있음",  color: "#00FF00" },
        "sitting":          { text: "앉기",    color: "#00FF00" },
        "rotating":         { text: "돌기",    color: "#00FFFF" },
        "etc":              { text: "기타",    color: "#CCCCCC" },  // 회색

        // [추가] 화재 감지용 매핑
        "fire":             { text: "화재",    color: "#FF4500" }, // 주황빛 빨강 (OrangeRed)
        "smoke":            { text: "연기",    color: "#A9A9A9" } // 진한 회색 (DarkGray)
    }
};