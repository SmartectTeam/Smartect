/**
 * actionbox.js
 * 위험 동작 박스 그리기 로직
 */

// 위험 동작 목록
const DANGEROUS_ACTIONS = new Set(['punching', 'pushing', 'fall', 'threat(zone)', 'threat(locked)', 'warning']);

// 위험 동작 상태 매핑 (view.js의 statusMap 스타일 참고)
const ACTION_STATUS_MAP = {
    "punching": { text: "폭행", color: "#FF0000" },
    "pushing": { text: "밀침", color: "#FF0000" },
    "fall": { text: "낙상", color: "#FF0000" },
    "threat(zone)": { text: "구역침입", color: "#FF0000" },
    "threat(locked)": { text: "위험(잠금)", color: "#FF0000" },
    "warning": { text: "경고", color: "#FFFF00" }
};

/**
 * 위험 동작 박스 그리기
 * @param {Array} actionMap - 동작 감지 데이터 배열
 * @param {HTMLElement} imgElement - 이미지 엘리먼트
 * @param {HTMLCanvasElement} canvas - 캔버스 엘리먼트
 * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
 */
function drawActionBoxes(actionMap, imgElement, canvas, ctx) {
    if (!actionMap || !Array.isArray(actionMap) || actionMap.length === 0) return;
    if (!canvas || !ctx || !imgElement) return;
    if (!imgElement.complete || imgElement.naturalWidth === 0 || imgElement.naturalHeight === 0) return;

    const naturalWidth = imgElement.naturalWidth;
    const naturalHeight = imgElement.naturalHeight;
    const scaleX = canvas.width / naturalWidth;
    const scaleY = canvas.height / naturalHeight;

    // 위험 동작만 필터링
    const dangerousActions = actionMap.filter(box => {
        const actionType = ((box.class || box.event_type || "").toLowerCase());
        return DANGEROUS_ACTIONS.has(actionType);
    });

    dangerousActions.forEach((box) => {
        if (typeof box.x1 !== "number" || typeof box.y1 !== "number" ||
            typeof box.x2 !== "number" || typeof box.y2 !== "number") return;

        const x1 = box.x1 * scaleX;
        const y1 = box.y1 * scaleY;
        const x2 = box.x2 * scaleX;
        const y2 = box.y2 * scaleY;
        const width = x2 - x1;
        const height = y2 - y1;

        const actionType = (box.class || box.event_type || "unknown").toLowerCase();
        const info = ACTION_STATUS_MAP[actionType] || { text: "위험동작", color: "#FF0000" };

        // 박스 그리기
        ctx.strokeStyle = info.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(x1, y1, width, height);

        // 라벨 그리기
        ctx.font = "bold 10px Arial";
        const label = `${info.text} ${((box.confidence || 0) * 100).toFixed(0)}%`;
        const textMetrics = ctx.measureText(label);
        const labelWidth = textMetrics.width + 6;
        const labelHeight = 16;

        ctx.fillStyle = info.color;
        ctx.fillRect(x1, y1 - labelHeight, labelWidth, labelHeight);

        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(label, x1 + 5, y1 - 5);
    });
}

// 전역 함수로 export (브라우저 환경)
if (typeof window !== 'undefined') {
    window.drawActionBoxes = drawActionBoxes;
    window.DANGEROUS_ACTIONS = DANGEROUS_ACTIONS; // stream.js에서도 사용 가능하도록
}

