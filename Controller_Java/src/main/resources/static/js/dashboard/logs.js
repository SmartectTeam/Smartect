// ========== 로그 시스템 (UI 전용) ==========
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