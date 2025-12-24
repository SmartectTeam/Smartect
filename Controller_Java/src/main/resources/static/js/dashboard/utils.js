// ========== 설정 ==========
const CAM_CONFIG = {
    1: { imgId: "live-image-1", canvasId: "detection-canvas-1", statusId: "ai-status-1" },
    2: { imgId: "live-image-2", canvasId: "detection-canvas-2", statusId: "ai-status-2" },
    3: { imgId: "live-image-3", canvasId: "detection-canvas-3", statusId: "ai-status-3" },
    4: { imgId: "live-image-4", canvasId: "detection-canvas-4", statusId: "ai-status-4" }
};

const FIXED_ASPECT_RATIO = 16 / 9;
const CANVAS_INIT_MAP = {};
const VIDEO_GRID_COLUMNS = 2;
let expandedCamNo = null;

// ========== 허용된 이벤트 타입 ==========
const ALLOWED_EVENT_TYPES = new Set([
    "punching",
    "pushing",
    "fall",
    "threat",
    "smoke",
    "fire"
]);

function isAllowedEventType(eventType) {
    if (!eventType || eventType === "") return false;

    const lowerEventType = eventType.toLowerCase();

    if (lowerEventType === "safe" || lowerEventType === "unknown") {
        return false;
    }

    for (const allowed of ALLOWED_EVENT_TYPES) {
        if (lowerEventType.startsWith(allowed)) {
            return true;
        }
    }

    return false;
}

// ========== 데이터 추출 함수 ==========
function extractFireMap(jsonData) {
    if (!jsonData) return null;
    if (Array.isArray(jsonData.fire_map)) return jsonData.fire_map;
    if (jsonData.combined && Array.isArray(jsonData.combined.fire_map)) return jsonData.combined.fire_map;
    if (Array.isArray(jsonData.fire_info) && Array.isArray(jsonData.fire_info[0])) return jsonData.fire_info[0];
    return null;
}

function extractActionMap(jsonData) {
    if (!jsonData) return null;
    if (Array.isArray(jsonData.action_map)) return jsonData.action_map;
    if (jsonData.combined && Array.isArray(jsonData.combined.action_map)) return jsonData.combined.action_map;
    return null;
}

function formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = hours >= 12 ? "오후" : "오전";
    const displayHours = hours % 12 || 12;
    return `${ampm} ${displayHours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ========== 화면 크기 계산 ==========
function calculateGridSize() {
    const videoGrid = document.querySelector('.video-grid');
    if (!videoGrid) return { width: 640, height: 360 };

    const containerWidth = videoGrid.offsetWidth;
    const gap = 16;
    const padding = 32;

    if (expandedCamNo !== null) {
        const fullWidth = containerWidth - padding;
        const fullHeight = Math.floor(fullWidth / FIXED_ASPECT_RATIO);
        return { width: fullWidth, height: fullHeight };
    }

    const panelWidth = Math.floor((containerWidth - padding - gap) / VIDEO_GRID_COLUMNS);
    const panelHeight = Math.floor(panelWidth / FIXED_ASPECT_RATIO);

    return { width: panelWidth, height: panelHeight };
}

function initializeCanvasWithFixedRatio(imgElement, canvas) {
    if (!imgElement || !canvas) return false;

    if (!imgElement.complete || imgElement.naturalWidth === 0 || imgElement.naturalHeight === 0) {
        return false;
    }

    const camNo = Object.keys(CAM_CONFIG).find(key =>
        CAM_CONFIG[key].imgId === imgElement.id
    );

    const needReinit = CANVAS_INIT_MAP[camNo] &&
                       (expandedCamNo === parseInt(camNo) || CANVAS_INIT_MAP[camNo].wasExpanded !== (expandedCamNo !== null));

    if (CANVAS_INIT_MAP[camNo] && !needReinit) {
        return true;
    }

    const { width: fixedWidth, height: fixedHeight } = calculateGridSize();

    const videoPanel = imgElement.closest('.video-panel');
    if (videoPanel) {
        const videoDisplay = videoPanel.querySelector('.video-display');
        if (videoDisplay) {
            videoDisplay.style.width = `${fixedWidth}px`;
            videoDisplay.style.height = `${fixedHeight}px`;
        }
    }

    imgElement.style.width = `${fixedWidth}px`;
    imgElement.style.height = `${fixedHeight}px`;
    imgElement.style.objectFit = 'contain';
    imgElement.style.display = 'block';

    canvas.width = fixedWidth;
    canvas.height = fixedHeight;
    canvas.style.width = `${fixedWidth}px`;
    canvas.style.height = `${fixedHeight}px`;

    CANVAS_INIT_MAP[camNo] = {
        width: fixedWidth,
        height: fixedHeight,
        initialized: true,
        wasExpanded: expandedCamNo !== null
    };

    return true;
}

// ========== 화면 확대/축소 ==========
function toggleExpandCamera(camNo) {
    const videoGrid = document.querySelector('.video-grid');
    if (!videoGrid) return;

    if (expandedCamNo === camNo) {
        expandedCamNo = null;
        videoGrid.classList.remove('expanded-mode');
    } else {
        expandedCamNo = camNo;
        videoGrid.classList.add('expanded-mode');
    }

    Object.keys(CAM_CONFIG).forEach(key => {
        const config = CAM_CONFIG[key];
        const panel = document.getElementById(config.imgId)?.closest('.video-panel');
        if (panel) {
            if (expandedCamNo === null) {
                panel.style.display = 'flex';
                panel.classList.remove('expanded');
            } else if (parseInt(key) === expandedCamNo) {
                panel.style.display = 'flex';
                panel.classList.add('expanded');
            } else {
                panel.style.display = 'none';
                panel.classList.remove('expanded');
            }
        }
    });

    Object.keys(CANVAS_INIT_MAP).forEach(key => {
        delete CANVAS_INIT_MAP[key];
    });

    setTimeout(() => {
        Object.keys(CAM_CONFIG).forEach(key => {
            const config = CAM_CONFIG[key];
            const imgElement = document.getElementById(config.imgId);
            const canvas = document.getElementById(config.canvasId);
            if (imgElement && canvas && imgElement.complete) {
                initializeCanvasWithFixedRatio(imgElement, canvas);
            }
        });
    }, 50);
}

function setupClickHandlers() {
    Object.keys(CAM_CONFIG).forEach(key => {
        const config = CAM_CONFIG[key];
        const panel = document.getElementById(config.imgId)?.closest('.video-panel');
        if (panel) {
            panel.style.cursor = 'pointer';
            panel.addEventListener('click', (e) => {
                if (e.target.closest('.panel-header') || e.target.closest('.panel-footer')) {
                    return;
                }
                toggleExpandCamera(parseInt(key));
            });

            panel.addEventListener('mouseenter', () => {
                if (expandedCamNo === null) {
                    panel.style.transform = 'scale(1.02)';
                    panel.style.transition = 'transform 0.2s ease';
                }
            });

            panel.addEventListener('mouseleave', () => {
                panel.style.transform = 'scale(1)';
            });
        }
    });
}