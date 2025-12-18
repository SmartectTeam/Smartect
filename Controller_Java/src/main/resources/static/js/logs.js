// 로그
const detectionLogContainer = document.getElementById("detection-log-container");
const MAX_DETECTION_LOGS = 30;

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

  const timeString = typeof formatTime === "function" ? formatTime(new Date()) : "";

  fireMap.forEach(box => {
    const logCard = createDetectionLogCard(cctvName, box, timeString);
    detectionLogContainer.insertBefore(logCard, detectionLogContainer.firstChild);
  });

  while (detectionLogContainer.children.length > MAX_DETECTION_LOGS) {
    detectionLogContainer.removeChild(detectionLogContainer.lastChild);
  }
}

