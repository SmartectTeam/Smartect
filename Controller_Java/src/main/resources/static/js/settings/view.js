/**
 * view.js
 * 캔버스 드로잉 및 DOM UI 업데이트
 * 수정사항: 객체 ID(Track ID) 시각화 및 그리기 격리 강화
 */
import { STATE } from './config.js';
import * as Utils from './zone_utils.js';

const canvas = document.getElementById('cctvCanvas');
const ctx = canvas.getContext('2d');

// ===============================================
// 1. 메인 드로잉 루프
// ===============================================
export function drawFrame(data) {
    if (!data.img_bytes) return;

    const blob = new Blob([data.img_bytes], { type: 'image/jpeg' });
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        drawZones();
        drawDraft();

        if (STATE.settings.vis_bbox) {
            // 박스 그리기
            drawDetections(data.action_map, img.width, img.height);
            drawDetections(data.fire_map, img.width, img.height);

            // 로그 업데이트
            const allDetections = [...(data.action_map || []), ...(data.fire_map || [])];
            updateAILog(allDetections);
        }
    };

    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
}

// 구역(Zone) 그리기
function drawZones() {
    if (!STATE.settings.zones) return;
    const w = canvas.width;
    const h = canvas.height;

    STATE.settings.zones.forEach((zone, idx) => {
        const points = zone.points;
        const scale = zone.scale || 1.0;

        const warnPoints = Utils.scalePolygon(points, scale);
        drawPolygonPath(warnPoints, w, h, "rgba(255, 215, 0, 0.3)", "rgba(255, 215, 0, 0.8)", true);

        const color = (idx === STATE.ui.dragTargetIndex) ? "rgba(0, 255, 0, 0.4)" : "rgba(255, 0, 0, 0.4)";
        drawPolygonPath(points, w, h, color, "red", false);
    });
}

function drawPolygonPath(points, w, h, fillColor, strokeColor, isDash) {
    if (points.length < 3) return;
    ctx.beginPath(); // 경로 시작 명시
    ctx.moveTo(points[0][0] * w, points[0][1] * h);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0] * w, points[i][1] * h);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    if (isDash) ctx.setLineDash([5, 5]); else ctx.setLineDash([]);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawDraft() {
    const pts = STATE.ui.drawPoints;
    if (pts.length === 0) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.beginPath();
    pts.forEach((p, i) => {
        const px = p.x * w;
        const py = p.y * h;
        ctx.fillStyle = "cyan";
        ctx.fillRect(px - 3, py - 3, 6, 6);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 1;
    ctx.stroke();
}

// [핵심 수정] 감지 박스 그리기
function drawDetections(mapData, srcW, srcH) {
    if (!mapData || !srcW || !srcH) return;

    const scaleX = canvas.width / srcW;
    const scaleY = canvas.height / srcH;

    mapData.forEach(det => {
        // [중요] 상태별 색상 가져오기 (매번 초기화됨)
        const info = STATE.statusMap[det.event_type] || { text: det.event_type, color: "#ccc" };

        const x = det.x1 * scaleX;
        const y = det.y1 * scaleY;
        const w = (det.x2 - det.x1) * scaleX;
        const h = (det.y2 - det.y1) * scaleY;

        // 1. 박스 그리기
        ctx.beginPath(); // [추가] 이전 경로와 섞이지 않게 차단
        ctx.strokeStyle = info.color;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, w, h);

        // 2. 손올리기 상한선 표시
        if (STATE.settings.hip_ratio > 0) {
            const ratio = STATE.settings.hip_ratio;
            const lineY = (y + h) - (h * ratio);

            ctx.beginPath(); // 새 경로 시작
            ctx.moveTo(x, lineY);
            ctx.lineTo(x + w, lineY);
            ctx.strokeStyle = "cyan"; // 여기서는 파란색
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 2]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 3. 텍스트 라벨 (상태 + ID)
        if (STATE.settings.vis_text) {
            ctx.fillStyle = info.color;
            ctx.font = "bold 14px sans-serif";

            // [수정] ID가 있으면 표시 (백엔드에서 id를 보내줘야 함)
            const idText = (det.id !== undefined) ? `[ID:${det.id}] ` : "";
            const label = `${idText}${info.text} ${(det.confidence*100).toFixed(0)}%`;

            const tw = ctx.measureText(label).width;

            ctx.fillRect(x, y - 24, tw + 10, 24);
            ctx.fillStyle = (info.color === '#FFFF00') ? "#000" : "#FFF"; // 노랑일때만 검은글씨
            if(info.color === '#00FF00') ctx.fillStyle = "#000"; // 초록일때도 검은글씨 추천

            ctx.fillText(label, x + 5, y - 7);
        }
    });
}

// ===============================================
// 2. UI 렌더링
// ===============================================
export function renderZoneList() {
    const container = document.getElementById('zoneListContainer');
    container.innerHTML = "";

    STATE.settings.zones.forEach((zone, idx) => {
        const div = document.createElement('div');
        div.className = 'zone-card';
        div.innerHTML = `
            <div class="zone-header">
                <span class="zone-title">Zone #${idx + 1}</span>
                <button class="btn-del" data-idx="${idx}">🗑️</button>
            </div>
            <div class="slider-row" style="margin-bottom:0">
                <label>경고 범위: <span id="val_scale_${idx}">${zone.scale || 1.0}</span></label>
                <input type="range" class="scale-slider" data-idx="${idx}"
                       min="1.0" max="3.0" step="0.1" value="${zone.scale || 1.0}">
            </div>
        `;
        container.appendChild(div);
    });

    container.querySelectorAll('.btn-del').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            STATE.settings.zones.splice(idx, 1);
            renderZoneList();
        });
    });

    container.querySelectorAll('.scale-slider').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const val = parseFloat(e.target.value);
            STATE.settings.zones[idx].scale = val;
            document.getElementById(`val_scale_${idx}`).textContent = val;
        });
    });
}

export function updateFormUI() {
    const s = STATE.settings;
    const modeSelect = document.getElementById('detection_mode');
    if(modeSelect && s.detection_mode) modeSelect.value = s.detection_mode;

    setCheck('fall_check', s.fall_check);
    setCheck('zone_check', s.zone_check);
    setCheck('vis_bbox', s.vis_bbox);
    setCheck('vis_text', s.vis_text);
    setCheck('vis_alert', s.vis_alert);

    setRange('fall_ratio', s.fall_ratio);
    setRange('reach_ratio', s.reach_ratio);
    setRange('hip_ratio', s.hip_ratio);
    setRange('ai_threshold', s.ai_threshold);
    setRange('lock_duration', s.lock_duration);
}

export function getFormData() {
    const modeSelect = document.getElementById('detection_mode');
    return {
        detection_mode: modeSelect ? modeSelect.value : "mix",
        fall_check: getCheck('fall_check'),
        zone_check: getCheck('zone_check'),
        vis_bbox: getCheck('vis_bbox'),
        vis_text: getCheck('vis_text'),
        vis_alert: getCheck('vis_alert'),
        fall_ratio: getRange('fall_ratio'),
        reach_ratio: getRange('reach_ratio'),
        hip_ratio: getRange('hip_ratio'),
        ai_threshold: getRange('ai_threshold'),
        lock_duration: getRange('lock_duration'),
        vis_skeleton: false,
        ai_check: true,
    };
}

function setCheck(id, v) { const el = document.getElementById(id); if(el) el.checked = !!v; }
function getCheck(id) { const el = document.getElementById(id); return el ? el.checked : false; }
function setRange(id, v) {
    const el = document.getElementById(id);
    const sp = document.getElementById('val_'+id);
    if(el && v) { el.value = v; if(sp) sp.innerText = v; }
}
function getRange(id) { const el = document.getElementById(id); return el ? parseFloat(el.value) : 0; }

document.querySelectorAll('input[type=range]').forEach(input => {
    input.addEventListener('input', (e) => {
        const sp = document.getElementById('val_'+e.target.id);
        if(sp) sp.innerText = e.target.value;
    });
});

// [수정] AI 로그 업데이트: ID 기반 표시
function updateAILog(mapData) {
    const logContent = document.getElementById('aiLogContent');
    if (!logContent) return;

    if (!mapData || mapData.length === 0) {
        logContent.innerHTML = "<div style='color:#777;'>No objects...</div>";
        return;
    }

    let html = "";
    mapData.forEach((det, idx) => {
        const action = det.event_type.toUpperCase();
        const score = (det.confidence * 100).toFixed(1);

        // ID가 있으면 쓰고, 없으면 배열 인덱스 사용
        const displayId = (det.id !== undefined) ? det.id : idx;

        const isDanger = ["PUNCHING", "PUSHING", "REACHING(ZONE)", "FALL", "THREAT", "FIRE"].some(d => action.includes(d));
        const cssClass = isDanger ? "danger" : "safe";

        html += `
            <div class="log-item ${cssClass}">
                [ID:${displayId}] <strong>${action}</strong> : ${score}%
                ${isDanger ? "⚠️" : ""}
            </div>
        `;
    });
    logContent.innerHTML = html;
}