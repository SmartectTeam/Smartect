/**
 * firebox.js
 * 화재/연기 박스 그리기 로직
 */

// 화재/연기 상태 매핑 (view.js의 statusMap 스타일 참고)
const FIRE_STATUS_MAP = {
    "fire": { text: "화재", color: "#FF4500" }, // 주황빛 빨강
    "smoke": { text: "연기", color: "#A9A9A9" } // 진한 회색
};

/**
 * 화재/연기 박스 그리기
 * @param {Array} fireMap - 화재/연기 감지 데이터 배열
 * @param {HTMLElement} imgElement - 이미지 엘리먼트
 * @param {HTMLCanvasElement} canvas - 캔버스 엘리먼트
 * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
 */
function drawFireBoxes(fireMap, imgElement, canvas, ctx) {
    if (!fireMap || !Array.isArray(fireMap) || fireMap.length === 0) return;
    if (!canvas || !ctx || !imgElement) return;
    if (!imgElement.complete || imgElement.naturalWidth === 0 || imgElement.naturalHeight === 0) return;

    const naturalWidth = imgElement.naturalWidth;
    const naturalHeight = imgElement.naturalHeight;
    const scaleX = canvas.width / naturalWidth;
    const scaleY = canvas.height / naturalHeight;

    fireMap.forEach((box) => {
        if (typeof box.x1 !== "number" || typeof box.y1 !== "number" ||
            typeof box.x2 !== "number" || typeof box.y2 !== "number") return;

        const x1 = box.x1 * scaleX;
        const y1 = box.y1 * scaleY;
        const x2 = box.x2 * scaleX;
        const y2 = box.y2 * scaleY;
        const width = x2 - x1;
        const height = y2 - y1;

        const eventType = (box.class || box.event_type || "fire").toLowerCase();
        const info = FIRE_STATUS_MAP[eventType] || { text: eventType, color: "#FF4500" };

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
    window.drawFireBoxes = drawFireBoxes;
}

