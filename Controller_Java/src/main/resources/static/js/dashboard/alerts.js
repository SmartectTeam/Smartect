// ========== 알림 시스템 ==========
const alertListContainer = document.getElementById("alert-list-container");
const detectionStartTimes = {};
const activeAlerts = new Map();
const ALERT_DURATION_THRESHOLD = 5000;
const MAX_ALERTS = 7;

// 이벤트 설정
const EVENT_CONFIG = {
    fire: { icon: "fa-solid fa-fire", text: "화재 감지", color: "#ff0000" },
    smoke: { icon: "fa-solid fa-smog", text: "연기 감지", color: "#ff8c00" },
    punching: { icon: "fa-solid fa-hand-fist", text: "폭행 감지", color: "#dc2626" },
    pushing: { icon: "fa-solid fa-hand", text: "밀침 감지", color: "#ea580c" },
    fall: { icon: "fa-solid fa-person-falling", text: "낙상 감지", color: "#f59e0b" },
    threat: { icon: "fa-solid fa-exclamation-triangle", text: "위협 감지", color: "#ef4444" }
};

function createAlertCard(cctvName, detectionType, timeString) {
    const alertCard = document.createElement("div");
    const config = EVENT_CONFIG[detectionType.toLowerCase()] ||
                   { icon: "fa-solid fa-exclamation", text: `${detectionType} 감지`, color: "#f59e0b" };

    alertCard.className = "alert-card warning";
    alertCard.style.borderColor = config.color;
    alertCard.innerHTML = `
        <div class="alert-header" style="color: ${config.color};">
            <i class="${config.icon}"></i> ${config.text}
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
    captureAlertScreen(cctvName, detectionType);
}

function updateAlertCount() {
    const count = activeAlerts.size;
    const subLabel = document.querySelector(".alert-section .sub-label");
    if (subLabel) subLabel.textContent = `고위험 알람 (${count})`;
}

function captureAlertScreen(cctvName, detectionType) {
    const camNo = parseInt(cctvName.replace("CCTV-", "").replace(/^0+/, "")) || parseInt(cctvName.replace("CCTV-", ""));
    const config = CAM_CONFIG[camNo];

    if (!config) return;

    const imgElement = document.getElementById(config.imgId);
    const canvas = document.getElementById(config.canvasId);

    if (!imgElement || !canvas || !imgElement.complete) return;

    const captureCanvas = document.createElement("canvas");
    const captureCtx = captureCanvas.getContext("2d");

    captureCanvas.width = canvas.width;
    captureCanvas.height = canvas.height;

    captureCtx.drawImage(imgElement, 0, 0, captureCanvas.width, captureCanvas.height);

    if (canvas.width > 0 && canvas.height > 0) {
        captureCtx.drawImage(canvas, 0, 0);
    }

    const imageBase64 = captureCanvas.toDataURL("image/jpeg", 0.9);

    fetch('/api/capture/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image: imageBase64,
            camNo: camNo,
            eventType: detectionType
        })
    }).catch(error => console.error('캡쳐 전송 실패:', error));
}

function checkAndProcessAlerts(jsonData, cctvName) {
    const fireMap = extractFireMap(jsonData);
    const actionMap = extractActionMap(jsonData);

    // fire 처리
    if (!fireMap || fireMap.length === 0) {
        const fireKey = `${cctvName}_fire`;
        const smokeKey = `${cctvName}_smoke`;
        if (detectionStartTimes[fireKey]) delete detectionStartTimes[fireKey];
        if (detectionStartTimes[smokeKey]) delete detectionStartTimes[smokeKey];
    } else {
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
    }

    // action 처리
    if (actionMap && actionMap.length > 0) {
        const detectedActions = new Set();
        actionMap.forEach(box => {
            const eventType = box.event_type || box.class;
            if (eventType && isAllowedEventType(eventType)) {
                detectedActions.add(eventType);
            }
        });

        const now = Date.now();

        detectedActions.forEach(type => {
            const key = `${cctvName}_${type}`;
            if (!detectionStartTimes[key]) {
                detectionStartTimes[key] = now;
            } else {
                const duration = now - detectionStartTimes[key];
                if (duration >= ALERT_DURATION_THRESHOLD) addAlert(cctvName, type);
            }
        });

        Object.keys(detectionStartTimes).forEach(key => {
            if (key.startsWith(cctvName)) {
                const type = key.replace(`${cctvName}_`, "");
                if (ALLOWED_EVENT_TYPES.has(type) && type !== "fire" && type !== "smoke") {
                    if (!detectedActions.has(type)) {
                        delete detectionStartTimes[key];
                    }
                }
            }
        });
    }
}