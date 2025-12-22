/**
 * zone_utils.js
 * 좌표 계산 및 기하학적 유틸리티
 */

// 1. 다각형 내부 점 판별 (Ray Casting Algorithm)
export function isPointInPolygon(point, vs) {
    // point: {x, y}, vs: [[x,y], [x,y], ...] (정규화된 좌표)
    const x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];

        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// 2. 다각형 중심점 계산 (단순 평균)
export function getPolygonCenter(points) {
    let cx = 0, cy = 0;
    points.forEach(p => { cx += p[0]; cy += p[1]; });
    return { x: cx / points.length, y: cy / points.length };
}

// 3. 다각형 스케일링 (중심 기준 확장)
export function scalePolygon(points, scale) {
    const center = getPolygonCenter(points);
    return points.map(p => {
        const dx = p[0] - center.x;
        const dy = p[1] - center.y;
        return [
            center.x + dx * scale,
            center.y + dy * scale
        ];
    });
}