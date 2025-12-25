// ========== 알림 시스템 ==========
const alertListContainer = document.getElementById("alert-list-container");
const detectionStartTimes = {};  // 시간 기반 추적
const detectionFrameCounts = {};  // 프레임 기반 추적
const lastDetectionTime = {};  // 마지막 감지 시간
const activeAlerts = new Map();
const MAX_ALERTS = 7;
const DETECTION_TIMEOUT = 3000;  // 3초간 감지 없으면 초기화

// 이벤트별 감지 조건 설정
const EVENT_DETECTION_CONFIG = {
    punching: { type: 'instant', threshold: 1 },      // 즉시
    pushing: { type: 'instant', threshold: 1 },       // 즉시
    fall: { type: 'time', threshold: 5000 },          // 5초
    threat: { type: 'time', threshold: 2000 },        // 2초
    smoke: { type: 'frame', threshold: 5 },           // 5프레임
    fire: { type: 'frame', threshold: 5 }             // 5프레임
};

// 이벤트 UI 설정
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
}

function updateAlertCount() {
    const count = activeAlerts.size;
    const subLabel = document.querySelector(".alert-section .sub-label");
    if (subLabel) subLabel.textContent = `고위험 알람 (${count})`;
}

function shouldTriggerAlert(cctvName, eventType) {
    const config = EVENT_DETECTION_CONFIG[eventType.toLowerCase()];
    if (!config) return false;

    const key = `${cctvName}_${eventType}`;
    const now = Date.now();

    // 마지막 감지 시간 업데이트
    lastDetectionTime[key] = now;

    if (config.type === 'instant') {
        // 즉시 알림 (punching, pushing)
        return true;
    }
    else if (config.type === 'time') {
        // 시간 기반 (fall: 5초, threat: 2초)
        if (!detectionStartTimes[key]) {
            detectionStartTimes[key] = now;
            return false;
        }

        const duration = now - detectionStartTimes[key];
        if (duration >= config.threshold) {
            return true;
        }
        return false;
    }
    else if (config.type === 'frame') {
        // 프레임 기반 (smoke: 5프레임, fire: 5프레임)
        if (!detectionFrameCounts[key]) {
            detectionFrameCounts[key] = 1;
        } else {
            detectionFrameCounts[key]++;
        }

        if (detectionFrameCounts[key] >= config.threshold) {
            return true;
        }
        return false;
    }

    return false;
}

function cleanupStaleDetections() {
    const now = Date.now();

    // 3초간 감지 없는 이벤트는 초기화
    Object.keys(lastDetectionTime).forEach(key => {
        const lastTime = lastDetectionTime[key];
        if (now - lastTime > DETECTION_TIMEOUT) {
            delete detectionStartTimes[key];
            delete detectionFrameCounts[key];
            delete lastDetectionTime[key];
        }
    });
}

function checkAndProcessAlerts(jsonData, cctvName) {
    const fireMap = extractFireMap(jsonData);
    const actionMap = extractActionMap(jsonData);

    // 오래된 감지 정보 정리
    cleanupStaleDetections();

    // 현재 프레임에서 감지된 모든 이벤트 타입
    const currentDetectedTypes = new Set();

    // fire 처리
    if (fireMap && fireMap.length > 0) {
        fireMap.forEach(box => {
            const eventType = box.class || box.event_type;
            if (eventType === "fire" || eventType === "smoke") {
                currentDetectedTypes.add(eventType);
            }
        });
    }

    // action 처리
    if (actionMap && actionMap.length > 0) {
        actionMap.forEach(box => {
            const eventType = box.event_type || box.class;
            if (eventType && isAllowedEventType(eventType)) {
                currentDetectedTypes.add(eventType);
            }
        });
    }

    // 감지된 이벤트만 처리
    currentDetectedTypes.forEach(eventType => {
        if (shouldTriggerAlert(cctvName, eventType)) {
            addAlert(cctvName, eventType);
            // 알림 생성 후 추적 초기화 (중복 방지)
            resetDetectionTracking(cctvName, eventType);
        }
    });
}