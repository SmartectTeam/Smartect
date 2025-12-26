// ========== 박스 렌더링 ==========
function drawBoundingBoxes(jsonData, imgElement, canvas, ctx) {
    if (!canvas || !ctx || !imgElement) return;

    const fireMap = extractFireMap(jsonData);
    const actionMap = extractActionMap(jsonData);

    const filteredActionMap = actionMap ? actionMap.filter(box => {
        const eventType = box.event_type || box.class;
        return eventType && isAllowedEventType(eventType);
    }) : [];

    const allBoxes = [];
    if (fireMap && Array.isArray(fireMap)) allBoxes.push(...fireMap);
    if (filteredActionMap.length > 0) allBoxes.push(...filteredActionMap);

    if (allBoxes.length === 0) {
        if (canvas.width > 0 && canvas.height > 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
    }

    if (!initializeCanvasWithFixedRatio(imgElement, canvas)) {
        return;
    }

    const camNo = Object.keys(CAM_CONFIG).find(key =>
        CAM_CONFIG[key].canvasId === canvas.id
    );

    const canvasInfo = CANVAS_INIT_MAP[camNo];
    if (!canvasInfo) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const naturalWidth = imgElement.naturalWidth;
    const naturalHeight = imgElement.naturalHeight;
    if (naturalWidth === 0 || naturalHeight === 0) return;

    // 이미지가 실제로 표시되는 크기 계산 (object-fit: contain 고려)
    const imgDisplayWidth = imgElement.offsetWidth;
    const imgDisplayHeight = imgElement.offsetHeight;

    const imgAspectRatio = naturalWidth / naturalHeight;
    const displayAspectRatio = imgDisplayWidth / imgDisplayHeight;

    let actualDisplayWidth, actualDisplayHeight;
    let offsetX = 0, offsetY = 0;

    if (imgAspectRatio > displayAspectRatio) {
        // 이미지가 더 넓음 - 좌우 꽉 차고 상하 여백
        actualDisplayWidth = imgDisplayWidth;
        actualDisplayHeight = imgDisplayWidth / imgAspectRatio;
        offsetY = (imgDisplayHeight - actualDisplayHeight) / 2;
    } else {
        // 이미지가 더 높음 - 상하 꽉 차고 좌우 여백
        actualDisplayHeight = imgDisplayHeight;
        actualDisplayWidth = imgDisplayHeight * imgAspectRatio;
        offsetX = (imgDisplayWidth - actualDisplayWidth) / 2;
    }

    // 원본 이미지 좌표 -> 실제 표시 좌표로 변환
    const scaleX = actualDisplayWidth / naturalWidth;
    const scaleY = actualDisplayHeight / naturalHeight;

    const eventColors = {
        fire: "#FF0000",
        smoke: "#FF8C00",
        punching: "#DC2626",
        pushing: "#EA580C",
        fall: "#F59E0B",
        threat: "#EF4444"
    };

    allBoxes.forEach((box) => {
        if (typeof box.x1 !== "number" || typeof box.y1 !== "number" ||
            typeof box.x2 !== "number" || typeof box.y2 !== "number") return;

        // 좌표 변환 (원본 -> 표시 + 오프셋)
        const x1 = box.x1 * scaleX + offsetX;
        const y1 = box.y1 * scaleY + offsetY;
        const x2 = box.x2 * scaleX + offsetX;
        const y2 = box.y2 * scaleY + offsetY;
        const width = x2 - x1;
        const height = y2 - y1;

        const eventType = (box.event_type || box.class || "unknown").toLowerCase();
        const color = eventColors[eventType] || "#00D9FF";

        // 박스 그리기
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x1, y1, width, height);

        // 라벨 그리기
        const label = box.event_type || box.class || "unknown";
        ctx.font = "bold 12px Arial";
        const textMetrics = ctx.measureText(label);
        const labelWidth = textMetrics.width + 8;
        const labelHeight = 18;

        ctx.fillStyle = color;
        ctx.fillRect(x1, y1 - labelHeight, labelWidth, labelHeight);

        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(label, x1 + 4, y1 - 4);
    });
}

function updateDisplay(data, imgElement, canvas, ctx, statusElement, camNo) {
    drawBoundingBoxes(data, imgElement, canvas, ctx);

    if (statusElement) {
        const fireMap = extractFireMap(data);
        const actionMap = extractActionMap(data);

        const hasFireDetection = fireMap && fireMap.length > 0;
        const hasActionDetection = actionMap && actionMap.some(box => {
            const eventType = box.event_type || box.class;
            return eventType && isAllowedEventType(eventType);
        });

        if (hasFireDetection || hasActionDetection) {
            let detectionText = "";
            if (hasFireDetection) detectionText += "🔥 화재 ";
            if (hasActionDetection) detectionText += "⚠️ 이벤트 ";
            detectionText += "감지 중!";

            statusElement.textContent = detectionText;
            statusElement.className = "ai-status text-danger blink";
        } else {
            statusElement.textContent = "정상 감시 중";
            statusElement.className = "ai-status text-success";
        }
    }

    const cctvName = `CCTV-0${camNo}`;
    checkAndProcessAlerts(data, cctvName);

    // 로그 통합
    const fireMap = extractFireMap(data);
    const actionMap = extractActionMap(data);
    const allDetections = [];
    if (fireMap && fireMap.length > 0) allDetections.push(...fireMap);
    if (actionMap && actionMap.length > 0) {
        const filtered = actionMap.filter(box => {
            const eventType = box.event_type || box.class;
            return eventType && isAllowedEventType(eventType);
        });
        allDetections.push(...filtered);
    }

    if (allDetections.length > 0) {
        addDetectionLog(cctvName, allDetections);
    }

    sendDetectionLogToServer(data);
}

// ========== WebSocket ==========
function initMultiCameraStream(socketUrl) {
    const msgpackLib = window.MessagePack || window.msgpack;
    const lastFireMapCache = {};
    const lastActionMapCache = {};
    const lastDataCache = {};
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

            // fire_map 캐싱
            if (data.fire_map && Array.isArray(data.fire_map)) {
                if (data.fire_map.length > 0) {
                    lastFireMapCache[camNo] = data.fire_map;
                } else {
                    data.fire_map = lastFireMapCache[camNo];
                }
            } else if (lastFireMapCache[camNo]) {
                data.fire_map = lastFireMapCache[camNo];
            }

            // action_map 캐싱 및 필터링
            if (data.action_map && Array.isArray(data.action_map)) {
                const filteredActions = data.action_map.filter(box => {
                    const eventType = box.event_type || box.class;
                    return eventType && isAllowedEventType(eventType);
                });

                if (filteredActions.length > 0) {
                    lastActionMapCache[camNo] = filteredActions;
                    data.action_map = filteredActions;
                } else {
                    data.action_map = lastActionMapCache[camNo];
                }
            } else if (lastActionMapCache[camNo]) {
                data.action_map = lastActionMapCache[camNo];
            }

            lastDataCache[camNo] = data;

            if (data.img_bytes) {
                const blob = new Blob([data.img_bytes], { type: "image/jpeg" });

                if (imgElement.src && imgElement.src.startsWith("blob:")) {
                    URL.revokeObjectURL(imgElement.src);
                }

                imgElement.onload = function() {
                    const lastData = lastDataCache[camNo];
                    if (lastData) {
                        updateDisplay(lastData, imgElement, canvas, ctx, statusElement, camNo);
                    }
                };

                imgElement.src = URL.createObjectURL(blob);
            } else {
                updateDisplay(data, imgElement, canvas, ctx, statusElement, camNo);
            }

        } catch (e) {
            console.error("WebSocket 오류:", e);
        }
    };

    socket.onclose = function () {
        console.log("재연결 시도...");
        setTimeout(() => initMultiCameraStream(socketUrl), 5000);
    };

    return socket;
}

// ========== 초기화 ==========
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("live-image-1")) {
        setupClickHandlers();

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                Object.keys(CANVAS_INIT_MAP).forEach(key => {
                    delete CANVAS_INIT_MAP[key];
                });
            }, 300);
        });

        initMultiCameraStream("ws://192.168.0.164:8080/ws/video");
    }
});