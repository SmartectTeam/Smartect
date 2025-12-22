/**
 * main.js
 * 앱 진입점, 이벤트 처리, 통신
 */
import { CONSTANTS, STATE } from './config.js';
import * as View from './view.js';
import * as Utils from './zone_utils.js';

const canvas = document.getElementById('cctvCanvas');

async function init() {
    console.log("[App] Start");

    // 1. 초기 로드
    await loadSettings(STATE.currentCamId);
    connectWebSocket();

    // 2. 탭 전환 이벤트
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // UI 변경
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            e.target.classList.add('active');
            const tabName = e.target.dataset.tab;
            document.getElementById(`tab-${tabName}`).classList.add('active');

            // 상태 변경
            STATE.ui.activeTab = tabName;
            console.log(`[Tab] Changed to ${tabName}`);
        });
    });

    // 3. 캔버스 마우스 이벤트 (그리기 & 드래그)
    setupCanvasEvents();

    // 4. 저장 및 기타 버튼
    document.getElementById('btnSave').addEventListener('click', saveSettings);

    document.getElementById('btnClearZones').addEventListener('click', () => {
        if(confirm("모든 구역을 삭제하시겠습니까?")) {
            STATE.settings.zones = [];
            View.renderZoneList();
        }
    });

    // [추가된 부분] 구역 추가 버튼 이벤트 (이게 없어서 추가가 안됐었습니다)
    document.getElementById('btnToggleDraw').addEventListener('click', (e) => {
        // 1. 모드 토글 (ON <-> OFF)
        STATE.ui.isDrawingMode = !STATE.ui.isDrawingMode;

        // 2. 버튼 텍스트 및 UI 상태 변경
        if (STATE.ui.isDrawingMode) {
            e.target.innerText = "취소 (Cancel)";
            e.target.style.backgroundColor = "#666"; // 버튼 회색 처리
            document.getElementById('cctvCanvas').style.cursor = "crosshair"; // 커서 십자 모양

            // 만약 다른 탭에 있었다면 ZONE 탭으로 강제 이동
            if (STATE.ui.activeTab !== 'ZONE') {
                document.querySelector('.tab-btn[data-tab="ZONE"]').click();
            }
        } else {
            e.target.innerText = "+ 구역 추가";
            e.target.style.backgroundColor = ""; // 버튼 원래 색 복구
            document.getElementById('cctvCanvas').style.cursor = "default"; // 커서 복구
            STATE.ui.drawPoints = []; // 찍다 만 점들 초기화
        }
    });

    // 카메라 변경 이벤트
    document.getElementById('camSelect').addEventListener('change', async (e) => {
        STATE.currentCamId = parseInt(e.target.value);
        STATE.ui.drawPoints = []; // 그리던거 초기화

        // 그리기 모드였다면 해제
        if (STATE.ui.isDrawingMode) {
            document.getElementById('btnToggleDraw').click();
        }

        await loadSettings(STATE.currentCamId);
    });
}

// ===========================================
// [핵심] 캔버스 이벤트 (드래그/그리기 분기)
// ===========================================
function setupCanvasEvents() {
    // 마우스 좌표를 (0.0 ~ 1.0) 비율로 변환하는 함수
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / canvas.width,
            y: (e.clientY - rect.top) / canvas.height
        };
    };

    // 1. 클릭 (MouseDown)
    canvas.addEventListener('mousedown', (e) => {
        if (STATE.ui.activeTab !== 'ZONE') return; // 탭 체크

        const pos = getPos(e);

        // A. 기존 구역 클릭했는지 확인 (드래그 시작)
        // 역순으로 체크 (위에 그려진 것부터 확인)
        let hitIndex = -1;
        if (STATE.settings.zones) {
            for (let i = STATE.settings.zones.length - 1; i >= 0; i--) {
                if (Utils.isPointInPolygon(pos, STATE.settings.zones[i].points)) {
                    hitIndex = i;
                    break;
                }
            }
        }

        if (hitIndex !== -1) {
            // 드래그 모드 진입
            STATE.ui.isDragging = true;
            STATE.ui.dragTargetIndex = hitIndex;
            STATE.ui.dragStartPos = pos;
            canvas.style.cursor = "move";
        } else {
            // 그리기 모드일 때만 점 찍기 허용
            if (STATE.ui.isDrawingMode) {
                addDrawPoint(pos);

                // 점 4개가 다 찍히면 모드 자동 종료
                if (STATE.ui.drawPoints.length === 4) {
                    // addDrawPoint 내부에서 처리 후 0이 됨
                    STATE.ui.isDrawingMode = false;
                    canvas.style.cursor = "default";

                    // 버튼 원래대로 복구
                    const btn = document.getElementById('btnToggleDraw');
                    btn.innerText = "+ 구역 추가";
                    btn.style.backgroundColor = "";
                }
            }
        }
    });

    // 2. 이동 (MouseMove)
    canvas.addEventListener('mousemove', (e) => {
        if (STATE.ui.activeTab !== 'ZONE') return;

        // 좌표 표시
        const pos = getPos(e);
        document.getElementById('coordInfo').innerText = `XY: ${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}`;

        // 드래그 중이라면?
        if (STATE.ui.isDragging && STATE.ui.dragTargetIndex !== -1) {
            const dx = pos.x - STATE.ui.dragStartPos.x;
            const dy = pos.y - STATE.ui.dragStartPos.y;

            // 해당 존의 모든 포인트 이동
            const zone = STATE.settings.zones[STATE.ui.dragTargetIndex];
            zone.points = zone.points.map(p => {
                let nx = p[0] + dx;
                let ny = p[1] + dy;
                // 화면 밖으로 못 나가게 (Clamp)
                nx = Math.max(0, Math.min(1, nx));
                ny = Math.max(0, Math.min(1, ny));
                return [nx, ny];
            });

            // 기준점 업데이트
            STATE.ui.dragStartPos = pos;
        }
    });

    // 3. 떼기 (MouseUp)
    canvas.addEventListener('mouseup', () => {
        if (STATE.ui.isDragging) {
            STATE.ui.isDragging = false;
            STATE.ui.dragTargetIndex = -1;
            canvas.style.cursor = "default";
        }
    });
}

// 점 추가 로직 (4개 되면 자동완성)
function addDrawPoint(pos) {
    STATE.ui.drawPoints.push(pos);

    // 4개의 점이 모이면 사각형 완성으로 간주
    if (STATE.ui.drawPoints.length === 4) {
        // 완성!
        const newZone = {
            points: STATE.ui.drawPoints.map(p => [p.x, p.y]),
            scale: 1.5 // 기본값
        };

        if (!STATE.settings.zones) STATE.settings.zones = [];
        STATE.settings.zones.push(newZone);

        // 초기화
        STATE.ui.drawPoints = [];

        // UI 갱신
        View.renderZoneList();
    }
}


// ===========================================
// 통신 관련
// ===========================================
async function loadSettings(camId) {
    try {
        const res = await fetch(`${CONSTANTS.API_GET}?cam_id=${camId}`);
        if(res.ok) {
            const data = await res.json();
            if(Object.keys(data).length > 0) {
                STATE.settings = { ...STATE.settings, ...data };
            }
            View.updateFormUI();
            View.renderZoneList(); // 리스트도 갱신
        }
    } catch(e) { console.error(e); }
}

async function saveSettings() {
    const newData = View.getFormData();
    // 메모리에 있는 최신 존 데이터를 강제로 주입
    newData.zones = STATE.settings.zones;

    newData.cam_id = STATE.currentCamId;
    STATE.settings = { ...STATE.settings, ...newData }; // Sync

    try {
        await fetch(CONSTANTS.API_UPDATE, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(newData)
        });
        alert("저장 완료!");
    } catch(e) { alert("저장 실패"); }
}

function connectWebSocket() {
    const ws = new WebSocket(CONSTANTS.WS_URL);
    ws.binaryType = "arraybuffer";
    ws.onopen = () => document.getElementById('connectionStatus').classList.add('connected');
    ws.onmessage = (e) => {
        try {
            // HTML에서 불러온 msgpack-lite 사용
            const data = msgpack.decode(new Uint8Array(e.data));

            // [추가] AI 데이터가 들어오는지 콘솔에 출력!
            if (data.action_map && data.action_map.length > 0) {
                console.log("🔥 AI Detection:", data.action_map);
            }

            if(data.cam_no === STATE.currentCamId) View.drawFrame(data);
        } catch(err) {}
    };
    ws.onclose = () => {
        setTimeout(connectWebSocket, 3000);
    };
}

// 실행
init();