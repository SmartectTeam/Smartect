// 알람 & 유틸리티(fire_map 추출 등...)
const alertListContainer = document.getElementById("alert-list-container");
const detectionStartTimes = {}; // { "CCTV-02_fire": timestamp, ... }
const activeAlerts = new Map(); // Map<key, alertElement>
const ALERT_DURATION_THRESHOLD = 5000; // ms
const MAX_ALERTS = 7;

// fire_map 추출
function extractFireMap(jsonData) {
  if (!jsonData) return null;
  if (Array.isArray(jsonData.fire_map)) return jsonData.fire_map;
  if (jsonData.combined && Array.isArray(jsonData.combined.fire_map)) return jsonData.combined.fire_map;
  // 구버전: fire_info = [fire_map, fire_json]
  if (Array.isArray(jsonData.fire_info) && Array.isArray(jsonData.fire_info[0])) return jsonData.fire_info[0];
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

// 감지 상태 확인 및 알림/로그 처리 (logs.js의 addDetectionLog 필요)
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

  // 로그 기록 (logs.js)
  if (typeof addDetectionLog === "function") {
    addDetectionLog(cctvName, fireMap);
  }
}

