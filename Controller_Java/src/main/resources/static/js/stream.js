const CAM_CONFIG = {
    1: { imgId: "live-image-1", canvasId: "detection-canvas-1", statusId: "ai-status-1" },
    2: { imgId: "live-image-2", canvasId: "detection-canvas-2", statusId: "ai-status-2" },
    3: { imgId: "live-image-3", canvasId: "detection-canvas-3", statusId: "ai-status-3" },
    4: { imgId: "live-image-4", canvasId: "detection-canvas-4", statusId: "ai-status-4" }
};

// ========== 알림 시스템 ==========
const alertListContainer = document.getElementById("alert-list-container");
const detectionStartTimes = {};
const activeAlerts = new Map();
const ALERT_DURATION_THRESHOLD = 5000;
const MAX_ALERTS = 7;

// ========== 로그 시스템 ==========
const detectionLogContainer = document.getElementById("detection-log-container");
const MAX_DETECTION_LOGS = 30;

// ========== 유틸리티 함수 ==========
// 위험 동작 목록 (actionbox.js에서 전역으로 export됨, 직접 참조)
// const DANGEROUS_ACTIONS는 actionbox.js에서 선언됨
// 안전 동작 목록 (박스 그리지 않음)
const SAFE_ACTIONS = new Set(['safe', 'walking', 'standing', 'sitting', 'rotating', 'reaching', 'etc']);

function extractFireMap(jsonData) {
    if (!jsonData) {
        return null;
    }

    if (Array.isArray(jsonData.fire_map)) {
        return jsonData.fire_map;
    }

    if (jsonData.combined && Array.isArray(jsonData.combined.fire_map)) {
        return jsonData.combined.fire_map;
    }

    if (Array.isArray(jsonData.fire_info) && Array.isArray(jsonData.fire_info[0])) {
        return jsonData.fire_info[0];
    }

    return null;
}

// 위험 동작만 필터링하여 추출
function extractDangerousActionMap(jsonData) {
    if (!jsonData) {
        return null;
    }

    let actionMap = null;
    if (Array.isArray(jsonData.action_map)) {
        actionMap = jsonData.action_map;
    } else if (jsonData.combined && Array.isArray(jsonData.combined.action_map)) {
        actionMap = jsonData.combined.action_map;
    }

    if (!actionMap || !Array.isArray(actionMap)) {
        return null;
    }

    // 위험 동작만 필터링 (actionbox.js의 window.DANGEROUS_ACTIONS 사용)
    const dangerousActions = window.DANGEROUS_ACTIONS || new Set(['punching', 'pushing', 'fall', 'threat(zone)', 'threat(locked)', 'warning']);
    return actionMap.filter(box => {
        const actionType = (box.class || box.event_type || "").toLowerCase();
        return dangerousActions.has(actionType);
    });
}

// 시간 포맷
function formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = hours >= 12 ? "오후" : "오전";
    const displayHours = hours % 12 || 12;
    return `${ampm} ${displayHours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ========== 알림 관련 함수 ==========
function createAlertCard(cctvName, detectionType, timeString) {
    const alertCard = document.createElement("div");
    let iconClass, alertText;
    
    if (detectionType === "fire") {
        iconClass = "fa-solid fa-fire";
        alertText = "화재 감지";
    } else if (detectionType === "smoke") {
        iconClass = "fa-solid fa-smog";
        alertText = "연기 감지";
    } else if (detectionType === "dangerous_action") {
        iconClass = "fa-solid fa-triangle-exclamation";
        alertText = "위험동작감지";
    } else {
        iconClass = "fa-solid fa-exclamation";
        alertText = "알림";
    }

    alertCard.className = "alert-card warning";
    alertCard.innerHTML = `
        <div class="alert-header">
            <i class="${iconClass}"></i> ${alertText}
        </div>
        <div class="alert-info">
            <span class="badge">${cctvName}</span>
            <span class="time">${timeString}</span>
        </div>
    `;
    return alertCard;
}

function addAlert(cctvName, detectionType) {
    if (!alertListContainer) return;
    
    const alertKey = `${cctvName}_${detectionType}`;

    if (activeAlerts.has(alertKey)) {
        const existingAlert = activeAlerts.get(alertKey);
        const timeElement = existingAlert.querySelector(".time");
        if (timeElement) timeElement.textContent = formatTime(new Date());
        alertListContainer.insertBefore(existingAlert, alertListContainer.firstChild);
        return;
    }

    const alertCard = createAlertCard(cctvName, detectionType, formatTime(new Date()));
    alertListContainer.insertBefore(alertCard, alertListContainer.firstChild);
    activeAlerts.set(alertKey, alertCard);

    while (alertListContainer.children.length > MAX_ALERTS) {
        const lastChild = alertListContainer.lastChild;
        const lastKey = Array.from(activeAlerts.entries()).find(([, el]) => el === lastChild)?.[0];
        if (lastKey) activeAlerts.delete(lastKey);
        alertListContainer.removeChild(lastChild);
    }

    updateAlertCount();
}

function updateAlertCount() {
    const count = activeAlerts.size;
    const subLabel = document.querySelector(".alert-section .sub-label");
    if (subLabel) subLabel.textContent = `고위험 알람 (${count})`;
}

// 감지 상태 확인 및 알림/로그 처리
function checkAndProcessAlerts(jsonData, cctvName) {
    const fireMap = extractFireMap(jsonData);
    const dangerousActionMap = extractDangerousActionMap(jsonData);

    // 화재/연기 감지 처리
    if (fireMap && fireMap.length > 0) {
        const detectedTypes = new Set();
        fireMap.forEach(box => {
            const boxClass = box.class || box.event_type;
            if (boxClass === "fire" || boxClass === "smoke") detectedTypes.add(boxClass);
        });

        const now = Date.now();

        ["fire", "smoke"].forEach(type => {
            const key = `${cctvName}_${type}`;
            if (detectedTypes.has(type)) {
                if (!detectionStartTimes[key]) {
                    detectionStartTimes[key] = now;
                } else {
                    const duration = now - detectionStartTimes[key];
                    if (duration >= ALERT_DURATION_THRESHOLD) addAlert(cctvName, type);
                }
            } else if (detectionStartTimes[key]) {
                delete detectionStartTimes[key];
            }
        });

        // 로그 기록
        addDetectionLog(cctvName, fireMap);
    } else {
        // 화재/연기 감지가 없으면 타이머 초기화
        const fireKey = `${cctvName}_fire`;
        const smokeKey = `${cctvName}_smoke`;
        if (detectionStartTimes[fireKey]) delete detectionStartTimes[fireKey];
        if (detectionStartTimes[smokeKey]) delete detectionStartTimes[smokeKey];
    }

    // 위험 동작 감지 처리
    if (dangerousActionMap && dangerousActionMap.length > 0) {
        const now = Date.now();
        const actionKey = `${cctvName}_dangerous_action`;
        
        if (!detectionStartTimes[actionKey]) {
            detectionStartTimes[actionKey] = now;
        } else {
            const duration = now - detectionStartTimes[actionKey];
            if (duration >= ALERT_DURATION_THRESHOLD) {
                addAlert(cctvName, "dangerous_action");
            }
        }
    } else {
        // 위험 동작 감지가 없으면 타이머 초기화
        const actionKey = `${cctvName}_dangerous_action`;
        if (detectionStartTimes[actionKey]) delete detectionStartTimes[actionKey];
    }
}

// ========== 로그 관련 함수 ==========
function createDetectionLogCard(cctvName, box, timeString) {
    const logCard = document.createElement("div");
    const boxClass = box.class || box.event_type || "unknown";
    const isFire = boxClass === "fire";
    const iconClass = isFire ? "fa-solid fa-fire" : "fa-solid fa-smog";
    const titleText = isFire ? "화재 탐지" : (boxClass === "smoke" ? "연기 탐지" : "객체 탐지");
    const confidenceText = typeof box.confidence === "number" ? `신뢰도: ${(box.confidence * 100).toFixed(0)}%` : "";

    logCard.className = "alert-card detection-log-card";
    logCard.innerHTML = `
        <div class="alert-header">
            <i class="${iconClass}"></i> ${titleText}
        </div>
        <div class="alert-info">
            <span class="badge">${cctvName}</span>
            <span class="time">${timeString}</span>
        </div>
        <div class="alert-info">
            <span class="badge">${boxClass}</span>
            <span class="time">${confidenceText}</span>
        </div>
    `;
    return logCard;
}

function addDetectionLog(cctvName, fireMap) {
    if (!detectionLogContainer || !Array.isArray(fireMap)) return;

    const timeString = formatTime(new Date());

    fireMap.forEach(box => {
        const logCard = createDetectionLogCard(cctvName, box, timeString);
        detectionLogContainer.insertBefore(logCard, detectionLogContainer.firstChild);
    });

    while (detectionLogContainer.children.length > MAX_DETECTION_LOGS) {
        detectionLogContainer.removeChild(detectionLogContainer.lastChild);
    }
}

// ========== 박스 렌더링 함수 ==========
// 통합 박스 렌더링 함수 (view.js의 drawFrame 스타일 참고)
// drawFireBoxes와 drawActionBoxes는 각각 firebox.js와 actionbox.js에서 로드됨
function drawBoundingBoxes(jsonData, imgElement, canvas, ctx) {
    if (!canvas || !ctx || !imgElement) {
        console.log("[drawBoundingBoxes] canvas, ctx, 또는 imgElement가 없음");
        return;
    }

    // 이미지가 아직 로드되지 않았으면 대기
    if (!imgElement.complete || imgElement.naturalWidth === 0 || imgElement.naturalHeight === 0) {
        console.log("[drawBoundingBoxes] 이미지가 아직 로드되지 않음 - 대기");
        return;
    }

    // Canvas 크기 설정 (한 번만)
    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = imgElement.offsetWidth || imgElement.clientWidth;
        canvas.height = imgElement.offsetHeight || imgElement.clientHeight;
        if (canvas.width === 0 || canvas.height === 0) return;
    }

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // view.js처럼 fire_map과 action_map을 따로 그리기
    const fireMap = extractFireMap(jsonData);
    const actionMap = jsonData.action_map || [];

    console.log("[drawBoundingBoxes] fireMap:", fireMap ? fireMap.length : 0, "개");
    console.log("[drawBoundingBoxes] actionMap:", actionMap ? actionMap.length : 0, "개");

    // 화재/연기 박스 그리기 (firebox.js에서 로드)
    if (typeof window.drawFireBoxes === 'function') {
        window.drawFireBoxes(fireMap, imgElement, canvas, ctx);
    }

    // 위험 동작 박스 그리기 (actionbox.js에서 로드)
    if (typeof window.drawActionBoxes === 'function') {
        window.drawActionBoxes(actionMap, imgElement, canvas, ctx);
    }
}

function initMultiCameraStream(socketUrl) {

    const msgpackLib = window.MessagePack || window.msgpack;
    const lastDataCache = {}; // 각 CCTV별 마지막 데이터 저장
    const lastFireMapCache = {}; // fire_map이 있을 때만 저장 (이미지 로드 대기 중 보존)
    const lastActionMapCache = {}; // action_map (위험 동작) 캐시
    const lastFireTime = {}; // 마지막 화재 감지 시각 (ms)
    const lastActionTime = {}; // 마지막 위험 동작 감지 시각 (ms)
    const FIRE_HOLD_DURATION = 2000; // 화재 박스 유지 시간(ms) - 2초
    const ACTION_HOLD_DURATION = 2000; // 위험 동작 박스 유지 시간(ms) - 2초
    
    // 전역에서 접근 가능하도록 window에 저장
    window.lastFireMapCache = lastFireMapCache;
    window.lastActionMapCache = lastActionMapCache;
    window.lastFireTime = lastFireTime;
    window.lastActionTime = lastActionTime;
    window.FIRE_HOLD_DURATION = FIRE_HOLD_DURATION;
    window.ACTION_HOLD_DURATION = ACTION_HOLD_DURATION;
    
    const socket = new WebSocket(socketUrl);

    socket.binaryType = "arraybuffer";

    socket.onmessage = function (event) {
        try {
            const data = msgpackLib.decode(new Uint8Array(event.data));

            const camNo = data.cam_no;
            const config = CAM_CONFIG[camNo];

            if (!config) return;

            const imgElement = document.getElementById(config.imgId);
            const canvas = document.getElementById(config.canvasId);
            const statusElement = document.getElementById(config.statusId);
            const ctx = canvas ? canvas.getContext("2d") : null;

            if (!imgElement) return;

            // fire_map / action_map 기본값 정리
            if (!Array.isArray(data.fire_map)) {
                data.fire_map = [];
            }
            if (!Array.isArray(data.action_map)) {
                data.action_map = [];
            }

            // 디버깅 로그
            console.log(`[WebSocket] CCTV-${camNo} 수신 - fire_map:`, data.fire_map ? data.fire_map.length : "null", "개");
            console.log(`[WebSocket] CCTV-${camNo} 수신 - fire_json:`, data.fire_json ? data.fire_json.length : "null", "개");
            if (data.fire_map && data.fire_map.length > 0) {
                console.log(`[WebSocket] CCTV-${camNo} fire_map 첫 번째 항목:`, data.fire_map[0]);
            }

            // fire_map 캐시 관리: 데이터가 있으면 캐시 업데이트, 빈 배열이면 캐시 유지 (이미지 로드 대기 중일 수 있음)
            if (data.fire_map && data.fire_map.length > 0) {
                lastFireMapCache[camNo] = data.fire_map;
                lastFireTime[camNo] = Date.now();
                console.log(`[WebSocket] CCTV-${camNo} fire_map 캐시 업데이트:`, data.fire_map.length, "개");
            } else {
                // 빈 배열이 와도, 최근 감지 후 일정 시간(FIRE_HOLD_DURATION) 이내면 캐시 유지
                const lastTime = lastFireTime[camNo] || 0;
                const elapsed = Date.now() - lastTime;
                if (elapsed > FIRE_HOLD_DURATION) {
                    // 충분히 시간이 지났으면 캐시 삭제 (박스 제거)
                    delete lastFireMapCache[camNo];
                    console.log(`[WebSocket] CCTV-${camNo} fire_map 빈 배열, ${elapsed}ms 경과 - 캐시 삭제`);
                } else {
                    console.log(`[WebSocket] CCTV-${camNo} fire_map 빈 배열, ${elapsed}ms 이내 - 캐시 유지`);
                }
            }

            // action_map 캐시 관리 (위험 동작만) - fire_map과 동일한 방식
            if (data.action_map && Array.isArray(data.action_map)) {
                const dangerousActions = extractDangerousActionMap(data);
                if (dangerousActions && dangerousActions.length > 0) {
                    lastActionMapCache[camNo] = data.action_map;
                    lastActionTime[camNo] = Date.now();
                    console.log(`[WebSocket] CCTV-${camNo} action_map 캐시 업데이트:`, dangerousActions.length, "개");
                } else {
                    // 빈 배열이 와도, 최근 감지 후 일정 시간(ACTION_HOLD_DURATION) 이내면 캐시 유지
                    const lastTime = lastActionTime[camNo] || 0;
                    const elapsed = Date.now() - lastTime;
                    if (elapsed > ACTION_HOLD_DURATION) {
                        delete lastActionMapCache[camNo];
                        console.log(`[WebSocket] CCTV-${camNo} action_map 빈 배열, ${elapsed}ms 경과 - 캐시 삭제`);
                    } else {
                        console.log(`[WebSocket] CCTV-${camNo} action_map 빈 배열, ${elapsed}ms 이내 - 캐시 유지`);
                    }
                }
            }

            // 마지막 데이터 저장
            lastDataCache[camNo] = data;

            // 알림 및 로그는 이미지 로드와 상관없이 항상 처리
            const cctvName = `CCTV-0${camNo}`;
            checkAndProcessAlerts(data, cctvName);

            if (data.img_bytes) {
                const blob = new Blob([data.img_bytes], { type: "image/jpeg" });

                if (imgElement.src && imgElement.src.startsWith("blob:")) {
                    URL.revokeObjectURL(imgElement.src);
                }

                // 이미지 로드 후 최신 데이터로 업데이트 (캐시에서 fire_map 복원)
                imgElement.onload = function() {
                    const lastData = lastDataCache[camNo];
                    if (lastData) {
                        // fire_map이 비어있으면 캐시에서 복원
                        if ((!lastData.fire_map || lastData.fire_map.length === 0) && lastFireMapCache[camNo]) {
                            lastData.fire_map = lastFireMapCache[camNo];
                            console.log(`[img.onload] CCTV-${camNo} 캐시에서 fire_map 복원:`, lastData.fire_map.length, "개");
                        }
                        // action_map도 복원
                        if ((!lastData.action_map || lastData.action_map.length === 0) && lastActionMapCache[camNo]) {
                            lastData.action_map = lastActionMapCache[camNo];
                        }
                        requestAnimationFrame(() => {
                            updateDisplay(lastData, imgElement, canvas, ctx, statusElement, camNo);
                        });
                    }
                };

                imgElement.src = URL.createObjectURL(blob);

                // 이미지가 이미 로드된 경우 즉시 처리 (캐시에서 fire_map 복원)
                if (imgElement.complete && imgElement.naturalWidth > 0 && imgElement.naturalHeight > 0) {
                    // fire_map이 비어있으면 캐시에서 복원
                    if ((!data.fire_map || data.fire_map.length === 0) && lastFireMapCache[camNo]) {
                        data.fire_map = lastFireMapCache[camNo];
                        console.log(`[즉시처리] CCTV-${camNo} 캐시에서 fire_map 복원:`, data.fire_map.length, "개");
                    }
                    // action_map도 복원
                    if ((!data.action_map || data.action_map.length === 0) && lastActionMapCache[camNo]) {
                        data.action_map = lastActionMapCache[camNo];
                    }
                    requestAnimationFrame(() => {
                        updateDisplay(data, imgElement, canvas, ctx, statusElement, camNo);
                    });
                }
            } else {
                // 이미지 데이터가 없으면, 이미지가 이미 로드된 경우에만 박스 처리 (캐시에서 fire_map 복원)
                if (imgElement.complete && imgElement.naturalWidth > 0 && imgElement.naturalHeight > 0) {
                    // fire_map이 비어있으면 캐시에서 복원
                    if ((!data.fire_map || data.fire_map.length === 0) && lastFireMapCache[camNo]) {
                        data.fire_map = lastFireMapCache[camNo];
                        console.log(`[이미지없음] CCTV-${camNo} 캐시에서 fire_map 복원:`, data.fire_map.length, "개");
                    }
                    // action_map도 복원
                    if ((!data.action_map || data.action_map.length === 0) && lastActionMapCache[camNo]) {
                        data.action_map = lastActionMapCache[camNo];
                    }
                    requestAnimationFrame(() => {
                        updateDisplay(data, imgElement, canvas, ctx, statusElement, camNo);
                    });
                }
            }

        } catch (e) {
            console.error(e);
        }
    };

    socket.onclose = function () {
        console.log("서버 연결 끊김. 재연결 시도...");
        // 필요 시 재연결 로직 추가 (setTimeout 등)
    };

    return socket;
}

function updateDisplay(data, imgElement, canvas, ctx, statusElement, camNo) {
    console.log(`[updateDisplay] CCTV-${camNo} 호출됨`);
    console.log(`[updateDisplay] data.fire_map:`, data.fire_map ? data.fire_map.length : "null", "개");
    
    // fire_map이 비어있으면 캐시에서 복원 (유지 시간 내)
    if ((!data.fire_map || data.fire_map.length === 0) && window.lastFireMapCache && window.lastFireMapCache[camNo]) {
        const lastTime = window.lastFireTime && window.lastFireTime[camNo] ? window.lastFireTime[camNo] : 0;
        const elapsed = Date.now() - lastTime;
        const holdDuration = window.FIRE_HOLD_DURATION || 2000;
        if (elapsed <= holdDuration) {
            data.fire_map = window.lastFireMapCache[camNo];
            console.log(`[updateDisplay] CCTV-${camNo} 캐시에서 fire_map 복원:`, data.fire_map.length, "개 (${elapsed}ms 경과)"); 
        } else {
            // 유지 시간 초과했으면 캐시 삭제
            delete window.lastFireMapCache[camNo];
            console.log(`[updateDisplay] CCTV-${camNo} 캐시 유지 시간 초과 (${elapsed}ms) - 박스 제거`);
        }
    }
    
    // action_map이 비어있으면 캐시에서 복원 (유지 시간 내)
    if ((!data.action_map || data.action_map.length === 0) && window.lastActionMapCache && window.lastActionMapCache[camNo]) {
        const lastTime = window.lastActionTime && window.lastActionTime[camNo] ? window.lastActionTime[camNo] : 0;
        const elapsed = Date.now() - lastTime;
        const holdDuration = window.ACTION_HOLD_DURATION || 2000;
        if (elapsed <= holdDuration) {
            data.action_map = window.lastActionMapCache[camNo];
            console.log(`[updateDisplay] CCTV-${camNo} 캐시에서 action_map 복원:`, data.action_map.length, "개 (${elapsed}ms 경과)");
        } else {
            // 유지 시간 초과했으면 캐시 삭제
            delete window.lastActionMapCache[camNo];
            console.log(`[updateDisplay] CCTV-${camNo} action_map 캐시 유지 시간 초과 (${elapsed}ms) - 박스 제거`);
        }
    }
    
    // 박스 렌더링 (화재/연기 + 위험 동작)
    drawBoundingBoxes(data, imgElement, canvas, ctx);

    // 상태 업데이트
    if (statusElement) {
        const fireMap = extractFireMap(data);
        const dangerousActionMap = extractDangerousActionMap(data);

        if (fireMap && fireMap.length > 0) {
            statusElement.textContent = "🔥 화재 감지 중!";
            statusElement.className = "ai-status text-danger blink";
        } else if (dangerousActionMap && dangerousActionMap.length > 0) {
            statusElement.textContent = "⚠️ 위험동작 감지 중!";
            statusElement.className = "ai-status text-danger blink";
        } else {
            statusElement.textContent = "정상 감시 중";
            statusElement.className = "ai-status text-success";
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // 만약 페이지에 CCTV 화면이 하나라도 있으면 연결 시작
    if (document.getElementById("live-image-1") || document.getElementById("live-image-2") || 
        document.getElementById("live-image-3") || document.getElementById("live-image-4")) {
        initMultiCameraStream("ws://localhost:8080/ws/video");
    }
});

//// WebSocket stream initializer (fire_router 전용)
//function initFireCameraStream({ camId = "02", socketUrl, imgId, canvasId, statusId }) {
//  const socket = new WebSocket(socketUrl);
//  const imgElement = document.getElementById(imgId);
//  const canvas = document.getElementById(canvasId);
//  const ctx = canvas.getContext("2d");
//  let lastJsonData = null;
//  socket.binaryType = "blob";
//
//  socket.onopen = function () {
//    console.log(`CCTV-${camId} Java 서버 접속`);
//  };
//
//  function updateFireDisplay() {
//    if (!lastJsonData || lastJsonData.stream_id !== "fire_router") {
//      if (canvas.width > 0 && canvas.height > 0) ctx.clearRect(0, 0, canvas.width, canvas.height);
//      return;
//    }
//    if (typeof drawBoundingBoxesFire === "function") {
//      drawBoundingBoxesFire(lastJsonData, imgElement, canvas, ctx);
//    }
//
//    if (statusId) {
//      const statusElement = document.getElementById(statusId);
//      if (statusElement) {
//        const fireMap = typeof extractFireMap === "function" ? extractFireMap(lastJsonData) : null;
//        if (fireMap && fireMap.length > 0) {
//          statusElement.textContent = "화재 감지 중...";
//          statusElement.className = "ai-status text-cyan";
//        } else {
//          statusElement.textContent = "AI 분석 중...";
//          statusElement.className = "ai-status";
//        }
//      }
//    }
//  }
//
//  socket.onmessage = function (event) {
//    if (typeof event.data === "string") {
//      try {
//        const jsonData = JSON.parse(event.data);
//        if (jsonData.stream_id === "fire_router") {
//          lastJsonData = jsonData;
//          const cctvName = jsonData.cam_id ? `CCTV-${jsonData.cam_id}` : `CCTV-${camId}`;
//          if (typeof checkAndProcessAlerts === "function") {
//            checkAndProcessAlerts(jsonData, cctvName);
//          }
//
//          if (imgElement.complete && imgElement.naturalWidth > 0) {
//            updateFireDisplay();
//          } else {
//            imgElement.onload = function () {
//              updateFireDisplay();
//            };
//          }
//        }
//      } catch (e) {
//        console.error(`CCTV-${camId} JSON 파싱 오류:`, e);
//      }
//    } else if (event.data instanceof Blob) {
//      if (lastJsonData && lastJsonData.stream_id !== "fire_router") return;
//      if (imgElement.src && imgElement.src.startsWith("blob:")) {
//        URL.revokeObjectURL(imgElement.src);
//      }
//      imgElement.src = URL.createObjectURL(event.data);
//      imgElement.onload = function () {
//        updateFireDisplay();
//      };
//    }
//  };
//
//  socket.onclose = function () {
//    console.log(`CCTV-${camId} 서버 연결 끊김`);
//  };
//
//  return { socket, imgElement, canvas, ctx, get lastJsonData() { return lastJsonData; } };
//}
//
//// CCTV-02 기본 초기화 (필요 시 다른 CCTV도 아래처럼 추가)
//if (document.getElementById("live-image-2")) {
//  initFireCameraStream({
//    camId: "02",
//    socketUrl: "ws://localhost:8080/ws/video",
//    imgId: "live-image-2",
//    canvasId: "detection-canvas-2",
//    statusId: "ai-status-2"
//  });
//}

