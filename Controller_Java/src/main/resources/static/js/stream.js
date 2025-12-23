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
    const isFire = detectionType === "fire";
    const iconClass = isFire ? "fa-solid fa-fire" : "fa-solid fa-smog";
    const alertText = isFire ? "화재 감지" : "연기 감지";

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

    // 새로운 알람 발생 시 캡쳐
    captureAlertScreen(cctvName, detectionType);
}

function updateAlertCount() {
    const count = activeAlerts.size;
    const subLabel = document.querySelector(".alert-section .sub-label");
    if (subLabel) subLabel.textContent = `고위험 알람 (${count})`;
}

// 알람 발생 시 CCTV 화면 캡쳐 (박스 포함)
function captureAlertScreen(cctvName, detectionType) {
    const camNo = parseInt(cctvName.replace("CCTV-", "").replace("0", "")) || parseInt(cctvName.replace("CCTV-", ""));
    const config = CAM_CONFIG[camNo];
    
    if (!config) {
        console.warn(`CCTV 설정을 찾을 수 없음: ${cctvName}`);
        return;
    }

    const imgElement = document.getElementById(config.imgId);
    const canvas = document.getElementById(config.canvasId);

    if (!imgElement || !canvas || !imgElement.complete) {
        console.warn(`이미지를 찾을 수 없음: ${cctvName}`);
        return;
    }

    // 이미지와 Canvas를 합치기
    const captureCanvas = document.createElement("canvas");
    const captureCtx = captureCanvas.getContext("2d");

    captureCanvas.width = imgElement.naturalWidth || imgElement.width;
    captureCanvas.height = imgElement.naturalHeight || imgElement.height;

    // 이미지 그리기
    captureCtx.drawImage(imgElement, 0, 0, captureCanvas.width, captureCanvas.height);

    // 박스 그리기 (스케일 조정)
    const scaleX = captureCanvas.width / (canvas.width || imgElement.offsetWidth);
    const scaleY = captureCanvas.height / (canvas.height || imgElement.offsetHeight);

    const canvasCtx = canvas.getContext("2d");
    if (canvas.width > 0 && canvas.height > 0) {
        // 스케일 조정
        captureCtx.save();
        captureCtx.scale(scaleX, scaleY);
        captureCtx.drawImage(canvas, 0, 0);
        captureCtx.restore();
    }

    const imageBase64 = captureCanvas.toDataURL("image/jpeg", 0.9);

    fetch('/api/capture/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            image: imageBase64,
            camNo: camNo,
            eventType: detectionType
        })
    }).then(response => response.json())
      .then(data => {
          if (data.success) {
              console.log(`캡쳐 저장 완료: ${data.path}`);
          } else {
              console.error(`캡쳐 저장 실패: ${data.error}`);
          }
      })
      .catch(error => {
          console.error(`캡쳐 전송 실패:`, error);
      });
}

// 감지 상태 확인 및 알림/로그 처리
function checkAndProcessAlerts(jsonData, cctvName) {
    const fireMap = extractFireMap(jsonData);

    if (!fireMap || fireMap.length === 0) {
        const fireKey = `${cctvName}_fire`;
        const smokeKey = `${cctvName}_smoke`;
        if (detectionStartTimes[fireKey]) delete detectionStartTimes[fireKey];
        if (detectionStartTimes[smokeKey]) delete detectionStartTimes[smokeKey];
        return;
    }

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
function drawBoundingBoxesFire(jsonData, imgElement, canvas, ctx) {
    if (!canvas || !ctx || !imgElement) return;

    const fireMap = extractFireMap(jsonData);

    if (!Array.isArray(fireMap)) {
        if (canvas.width > 0 && canvas.height > 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
    }
    if (fireMap.length === 0) {
        if (canvas.width > 0 && canvas.height > 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
    }

    // 이미지가 아직 로드되지 않았으면 대기
    if (!imgElement.complete || imgElement.naturalWidth === 0 || imgElement.naturalHeight === 0) {
        return;
    }

    // Canvas 크기 설정 (한 번만)
    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = imgElement.offsetWidth || imgElement.clientWidth;
        canvas.height = imgElement.offsetHeight || imgElement.clientHeight;
        if (canvas.width === 0 || canvas.height === 0) return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const naturalWidth = imgElement.naturalWidth;
    const naturalHeight = imgElement.naturalHeight;
    if (naturalWidth === 0 || naturalHeight === 0) return;

    const scaleX = canvas.width / naturalWidth;
    const scaleY = canvas.height / naturalHeight;

    // 박스 그리기 최적화
    fireMap.forEach((box) => {
        if (typeof box.x1 !== "number" || typeof box.y1 !== "number" ||
            typeof box.x2 !== "number" || typeof box.y2 !== "number") return;

        const x1 = box.x1 * scaleX;
        const y1 = box.y1 * scaleY;
        const x2 = box.x2 * scaleX;
        const y2 = box.y2 * scaleY;
        const width = x2 - x1;
        const height = y2 - y1;

        const boxClass = box.class || box.event_type || "unknown";
        const isFire = boxClass === "fire";
        const color = isFire ? "#FF0000" : "#FF8C00";

        // 박스 그리기
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, width, height);

        // 라벨 그리기
        const label = boxClass;
        ctx.font = "bold 10px Arial";
        const textMetrics = ctx.measureText(label);
        const labelWidth = textMetrics.width + 6;
        const labelHeight = 16;

        ctx.fillStyle = color;
        ctx.fillRect(x1, y1 - labelHeight, labelWidth, labelHeight);

        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(label, x1 + 5, y1 - 5);
    });
}

function initMultiCameraStream(socketUrl) {

    const msgpackLib = window.MessagePack || window.msgpack;
    const lastFireMapCache = {};
    const lastDataCache = {}; // 각 CCTV별 마지막 데이터 저장
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

            // 새 데이터가 있으면 캐시 업데이트, 없으면 캐시된 데이터 사용
            if (data.fire_map && Array.isArray(data.fire_map)) {
                if (data.fire_map.length > 0) {
                    // 캐시 업데이트
                    lastFireMapCache[camNo] = data.fire_map;
                } else {
                    // 캐시 유지
                    data.fire_map = lastFireMapCache[camNo];
                }
            } else if (lastFireMapCache[camNo]) {
                data.fire_map = lastFireMapCache[camNo];
            }

            // 마지막 데이터 저장
            lastDataCache[camNo] = data;

            // fire_map이 있을 때 박스 그리기
            if (data.fire_map && data.fire_map.length > 0) {
                requestAnimationFrame(() => {
                    updateDisplay(data, imgElement, canvas, ctx, statusElement, camNo);
                });
            } else if (data.fire_map && data.fire_map.length === 0) {
                // 빈 배열일 때 박스 제거
                requestAnimationFrame(() => {
                    if (canvas && ctx && canvas.width > 0 && canvas.height > 0) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                    if (statusElement) {
                        statusElement.textContent = "정상 감시 중";
                        statusElement.className = "ai-status text-success";
                    }
                });
            }
            
            if (data.img_bytes) {
                const blob = new Blob([data.img_bytes], { type: "image/jpeg" });

                if (imgElement.src && imgElement.src.startsWith("blob:")) {
                    URL.revokeObjectURL(imgElement.src);
                }

                // 마지막 데이터로 업데이트
                imgElement.onload = function() {
                    const lastData = lastDataCache[camNo];
                    if (lastData) {
                        requestAnimationFrame(() => {
                            updateDisplay(lastData, imgElement, canvas, ctx, statusElement, camNo);
                        });
                    }
                };

                imgElement.src = URL.createObjectURL(blob);

                if (imgElement.complete && imgElement.naturalWidth > 0) {
                    const lastData = lastDataCache[camNo];
                    if (lastData) {
                        requestAnimationFrame(() => {
                            updateDisplay(lastData, imgElement, canvas, ctx, statusElement, camNo);
                        });
                    }
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

// 로그 전송 제어
const logThrottleMap = {}; // { camNo: { lastSent: timestamp, lastData: string } }
const LOG_THROTTLE_INTERVAL = 5000; // 5초마다 한 번만 저장

// 로그 전송 함수 (서버로 전송)
function sendDetectionLogToServer(data) {
    // fire_map이나 fire_json이 비어있으면 전송하지 않음
    const hasFireData = (data.fire_map && data.fire_map.length > 0) ||
                       (data.fire_json && data.fire_json.length > 0);
    const hasActionData = (data.action_map && data.action_map.length > 0) ||
                         (data.action_json && data.action_json.length > 0);

    if (!hasFireData && !hasActionData) {
        return; // 감지 데이터가 없으면 전송하지 않음
    }

    const camNo = data.cam_no;
    const now = Date.now();

    // img_bytes는 전송하지 않음
    const logData = {
        type: data.type || "COMBINED",
        cam_no: camNo,
        fire_json: data.fire_json || [],
        fire_map: data.fire_map || [],
        action_json: data.action_json || [],
        action_map: data.action_map || []
    };

    const dataString = JSON.stringify(logData);

    // 중복 체크
    if (!logThrottleMap[camNo]) {
        logThrottleMap[camNo] = { lastSent: 0, lastData: "" };
    }

    const throttleInfo = logThrottleMap[camNo];
    const timeSinceLastSent = now - throttleInfo.lastSent;

    // 같은 데이터면 저장하지 않음
    if (dataString === throttleInfo.lastData) {
        return;
    }

    // 5초 이내에 전송했으면 스킵
    if (timeSinceLastSent < LOG_THROTTLE_INTERVAL) {
        return;
    }

    // 전송 및 기록 업데이트
    throttleInfo.lastSent = now;
    throttleInfo.lastData = dataString;

    // 비동기로 서버에 전송
    fetch('/api/detection-log/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(logData)
    }).catch(error => {
        console.error('로그 전송 실패:', error);
    });
}

function updateDisplay(data, imgElement, canvas, ctx, statusElement, camNo) {
    console.log(`[updateDisplay] CCTV-${camNo} 호출됨, fire_map:`, data.fire_map ? data.fire_map.length : 0, "개");
    
    // 박스 렌더링
    drawBoundingBoxesFire(data, imgElement, canvas, ctx);

    // 상태 업데이트
    if (statusElement) {
        const fireMap = extractFireMap(data);

        if (fireMap && fireMap.length > 0) {
            statusElement.textContent = "🔥 화재 감지 중!";
            statusElement.className = "ai-status text-danger blink";
        } else {
            statusElement.textContent = "정상 감시 중";
            statusElement.className = "ai-status text-success";
        }
    }

    // 알림 및 로그 처리
    const cctvName = `CCTV-0${camNo}`;
    checkAndProcessAlerts(data, cctvName);

    // 서버로 로그 전송
    sendDetectionLogToServer(data);
}

document.addEventListener("DOMContentLoaded", () => {
    // 만약 페이지에 CCTV 화면이 하나라도 있으면 연결 시작
    if (document.getElementById("live-image-1") || document.getElementById("live-image-2")) {
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

