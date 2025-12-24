// ========== 로그 시스템 ==========
const detectionLogContainer = document.getElementById("detection-log-container");
const MAX_DETECTION_LOGS = 30;

function createDetectionLogCard(cctvName, box, timeString) {
    const logCard = document.createElement("div");
    const eventType = box.event_type || box.class || "unknown";

    const config = EVENT_CONFIG[eventType.toLowerCase()] ||
                   { icon: "fa-solid fa-exclamation", text: "객체 탐지", color: "#64748b" };

    const confidenceText = typeof box.confidence === "number" ?
                          `신뢰도: ${(box.confidence * 100).toFixed(0)}%` : "";

    logCard.className = "alert-card detection-log-card";
    logCard.innerHTML = `
        <div class="alert-header" style="color: ${config.color};">
            <i class="${config.icon}"></i> ${config.text}
        </div>
        <div class="alert-info">
            <span class="badge">${cctvName}</span>
            <span class="time">${timeString}</span>
        </div>
        <div class="alert-info">
            <span class="badge" style="border-color: ${config.color};">${eventType}</span>
            <span class="time">${confidenceText}</span>
        </div>
    `;
    return logCard;
}

function addDetectionLog(cctvName, allDetections) {
    if (!detectionLogContainer || !Array.isArray(allDetections)) return;

    const timeString = formatTime(new Date());

    allDetections.forEach(box => {
        const logCard = createDetectionLogCard(cctvName, box, timeString);
        detectionLogContainer.insertBefore(logCard, detectionLogContainer.firstChild);
    });

    while (detectionLogContainer.children.length > MAX_DETECTION_LOGS) {
        detectionLogContainer.removeChild(detectionLogContainer.lastChild);
    }
}

// 서버 로그 전송
const logThrottleMap = {};
const LOG_THROTTLE_INTERVAL = 5000;

function sendDetectionLogToServer(data) {
    const hasFireData = (data.fire_map && data.fire_map.length > 0) ||
                       (data.fire_json && data.fire_json.length > 0);
    const hasActionData = (data.action_map && data.action_map.length > 0) ||
                         (data.action_json && data.action_json.length > 0);

    if (!hasFireData && !hasActionData) return;

    const camNo = data.cam_no;
    const now = Date.now();

    const logData = {
        type: data.type || "COMBINED",
        cam_no: camNo,
        fire_json: data.fire_json || [],
        fire_map: data.fire_map || [],
        action_json: data.action_json || [],
        action_map: data.action_map || []
    };

    const dataString = JSON.stringify(logData);

    if (!logThrottleMap[camNo]) {
        logThrottleMap[camNo] = { lastSent: 0, lastData: "" };
    }

    const throttleInfo = logThrottleMap[camNo];
    const timeSinceLastSent = now - throttleInfo.lastSent;

    if (dataString === throttleInfo.lastData) return;
    if (timeSinceLastSent < LOG_THROTTLE_INTERVAL) return;

    throttleInfo.lastSent = now;
    throttleInfo.lastData = dataString;

    fetch('/api/detection-log/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
    }).catch(error => console.error('로그 전송 실패:', error));
}