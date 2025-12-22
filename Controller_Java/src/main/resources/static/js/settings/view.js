/**
 * view.js
 * 캔버스 드로잉 및 DOM UI 업데이트
 */
import { STATE } from './config.js';
import * as Utils from './zone_utils.js';

const canvas = document.getElementById('cctvCanvas');
const ctx = canvas.getContext('2d');
const overlayInfo = document.getElementById('overlayInfo');

// ===============================================
// 1. 메인 드로잉 루프 (영상 -> 구역 -> 박스 순서)
// ===============================================
export function drawFrame(data) {
    if (!data.img_bytes) return;

    const blob = new Blob([data.img_bytes], { type: 'image/jpeg' });
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
        // [수정 1] 캔버스 크기를 부모 박스(화면)에 강제로 맞춤 (꽉 채우기)
        // 영상 비율 무시하고 찌그러뜨려서라도 꽉 채움 -> 좌표 계산이 쉬워짐
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        // [수정 2] 이미지를 캔버스 크기만큼 늘려서 그리기 (Stretch)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 메모리 해제
        URL.revokeObjectURL(url);

        // [수정 3] 그리기 순서 중요! (영상 -> 저장된 구역 -> 점 -> 박스)
        // 이 함수들이 drawImage보다 밑에 있어야 점이 보입니다.
        drawZones();
        drawDraft();  // <-- 이게 있어야 찍고 있는 점이 보임

        // 객체 박스 그리기
        if (STATE.settings.vis_bbox) {
            drawDetections(data.action_map, img.width, img.height);
            drawDetections(data.fire_map, img.width, img.height);

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

        // A. 노란색 경고 구역 (확장된 범위)
        const warnPoints = Utils.scalePolygon(points, scale);
        drawPolygonPath(warnPoints, w, h, "rgba(255, 215, 0, 0.3)", "rgba(255, 215, 0, 0.8)", true);

        // B. 빨간색 위험 구역 (실제 범위)
        const color = (idx === STATE.ui.dragTargetIndex) ? "rgba(0, 255, 0, 0.4)" : "rgba(255, 0, 0, 0.4)";
        drawPolygonPath(points, w, h, color, "red", false);
    });
}

// 다각형 그리기 헬퍼
function drawPolygonPath(points, w, h, fillColor, strokeColor, isDash) {
    if (points.length < 3) return;
    ctx.beginPath();
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

// 그리기 중인 점/선 표시
function drawDraft() {
    const pts = STATE.ui.drawPoints;
    if (pts.length === 0) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.beginPath();
    pts.forEach((p, i) => {
        const px = p.x * w;
        const py = p.y * h;
        // 점 그리기
        ctx.fillStyle = "cyan";
        ctx.fillRect(px - 3, py - 3, 6, 6);

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 1;
    ctx.stroke();
}

// 감지 박스 그리기 (한글 매핑 + 색상)
function drawDetections(mapData, srcW, srcH) {
    if (!mapData || !srcW || !srcH) return;

    // 1. 배율 계산 (현재 캔버스 크기 / 원본 이미지 크기)
    const scaleX = canvas.width / srcW;
    const scaleY = canvas.height / srcH;

    mapData.forEach(det => {
        const info = STATE.statusMap[det.event_type] || { text: det.event_type, color: "#ccc" };

        // 2. 좌표 보정 (원본 좌표 * 배율)
        // 백엔드 좌표(det.x1 등)에 배율을 곱해서 현재 화면 크기에 맞춤
        const x = det.x1 * scaleX;
        const y = det.y1 * scaleY;
        const w = (det.x2 - det.x1) * scaleX;
        const h = (det.y2 - det.y1) * scaleY;

        // 3. 그리기 (이후는 동일)
        ctx.strokeStyle = info.color;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, w, h);

        // 손올리기 상한선 (Hip Ratio) 시각화
        // 범위: 골반(0.5) ~ 머리끝(1.0) 사이에서만 조정
        // ============================================================
        if (STATE.settings.hip_ratio > 0) {
            // 사용자 설정값 (HTML에서 0.5 ~ 1.0 사이로 제한됨)
            const ratio = STATE.settings.hip_ratio;

            // 좌표 계산 (바닥에서부터 비율만큼 위로)
            // (y + h)는 발바닥 좌표, h * ratio는 높이
            const lineY = (y + h) - (h * ratio);

            // 선 그리기
            ctx.beginPath();
            ctx.moveTo(x, lineY);
            ctx.lineTo(x + w, lineY);

            ctx.strokeStyle = "cyan"; // 잘 보이는 청록색
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 2]);  // 점선
            ctx.stroke();
            ctx.setLineDash([]);      // 점선 초기화

            // (선택사항) 현재 높이 텍스트 표시
            // 예: "Limit: 85%" (어깨 쯤)
            if (STATE.settings.vis_text) {
                ctx.fillStyle = "cyan";
                ctx.font = "10px sans-serif";
                ctx.fillText(`H-Limit: ${(ratio * 100).toFixed(0)}%`, x + w + 2, lineY + 3);
            }
        }

        if (STATE.settings.vis_text) {
            ctx.fillStyle = info.color;
            ctx.font = "bold 14px sans-serif";
            const label = `${info.text} ${(det.confidence*100).toFixed(0)}%`;
            const tw = ctx.measureText(label).width;

            ctx.fillRect(x, y - 24, tw + 10, 24);
            ctx.fillStyle = "#000";
            ctx.fillText(label, x + 5, y - 7);
        }
    });
}

// ===============================================
// 2. UI 렌더링 (리스트, 폼)
// ===============================================

// 우측 패널 Zone 리스트 그리기
export function renderZoneList() {
    const container = document.getElementById('zoneListContainer');
    container.innerHTML = ""; // 초기화

    STATE.settings.zones.forEach((zone, idx) => {
        const div = document.createElement('div');
        div.className = 'zone-card';
        div.innerHTML = `
            <div class="zone-header">
                <span class="zone-title">Zone #${idx + 1}</span>
                <button class="btn-del" data-idx="${idx}">🗑️</button>
            </div>
            <div class="slider-row" style="margin-bottom:0">
                <label>경고 범위 (Scale): <span id="val_scale_${idx}">${zone.scale || 1.0}</span></label>
                <input type="range" class="scale-slider" data-idx="${idx}" 
                       min="1.0" max="3.0" step="0.1" value="${zone.scale || 1.0}">
            </div>
        `;
        container.appendChild(div);
    });

    // 이벤트 리스너 재부착
    // 1. 삭제 버튼
    container.querySelectorAll('.btn-del').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            STATE.settings.zones.splice(idx, 1);
            renderZoneList();
        });
    });

    // 2. 스케일 슬라이더
    container.querySelectorAll('.scale-slider').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const val = parseFloat(e.target.value);
            STATE.settings.zones[idx].scale = val;
            document.getElementById(`val_scale_${idx}`).textContent = val;
        });
    });
}

// 폼 UI 업데이트
export function updateFormUI() {
    const s = STATE.settings;

    // 모드 선택값 적용
    const modeSelect = document.getElementById('detection_mode');
    if(modeSelect && s.detection_mode) {
        modeSelect.value = s.detection_mode;
    }

    // 체크박스
    setCheck('fall_check', s.fall_check);
    setCheck('zone_check', s.zone_check);

    setCheck('vis_bbox', s.vis_bbox);
    setCheck('vis_text', s.vis_text);
    setCheck('vis_alert', s.vis_alert);

    // 슬라이더
    setRange('fall_ratio', s.fall_ratio);
    setRange('reach_ratio', s.reach_ratio);
    setRange('hip_ratio', s.hip_ratio);
    setRange('ai_threshold', s.ai_threshold);
    setRange('lock_duration', s.lock_duration);
}

// Form 데이터 읽기
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

        // ===============================================
        // 필수지만 UI에는 없는 것 (하드코딩 유지)
        // ===============================================
        vis_skeleton: false,
        ai_check: true,

        // zones: STATE.settings.zones // 현재 메모리에 있는 존 데이터
    };
}

// 유틸
function setCheck(id, v) { const el = document.getElementById(id); if(el) el.checked = !!v; }
function getCheck(id) { const el = document.getElementById(id); return el ? el.checked : false; }
function setRange(id, v) {
    const el = document.getElementById(id);
    const sp = document.getElementById('val_'+id);
    if(el && v) { el.value = v; if(sp) sp.innerText = v; }
}
function getRange(id) { const el = document.getElementById(id); return el ? parseFloat(el.value) : 0; }

// 슬라이더 값 변경 시 숫자 업데이트
document.querySelectorAll('input[type=range]').forEach(input => {
    input.addEventListener('input', (e) => {
        const sp = document.getElementById('val_'+e.target.id);
        if(sp) sp.innerText = e.target.value;
    });
});


// [추가] AI 로그 업데이트 함수
function updateAILog(mapData) {
    const logContent = document.getElementById('aiLogContent');
    if (!logContent) return;

    if (!mapData || mapData.length === 0) {
        logContent.innerHTML = "<div style='color:#777;'>No objects detected...</div>";
        return;
    }

    let html = "";

    // 감지된 모든 객체의 정보를 텍스트로 변환
    mapData.forEach((det, idx) => {
        // det.event_type에는 백엔드에서 보낸 'punching', 'walking' 등이 들어있음
        const action = det.event_type.toUpperCase();
        const score = (det.confidence * 100).toFixed(1);

        // 위험 여부에 따라 색상 클래스 지정
        // 백엔드에서 DANGER_ACTIONS에 있으면 event_type이 그대로 와도 danger 처리 될 것임
        // 여기서는 단어 자체로 간단히 판단
        const isDanger = ["PUNCHING", "PUSHING", "REACHING(ZONE)", "FALL", "THREAT"].some(d => action.includes(d));
        const cssClass = isDanger ? "danger" : "safe";

        html += `
            <div class="log-item ${cssClass}">
                [ID:${idx}] <strong>${action}</strong> : ${score}% 
                ${isDanger ? "⚠️ DETECTED" : ""}
            </div>
        `;
    });

    logContent.innerHTML = html;
}