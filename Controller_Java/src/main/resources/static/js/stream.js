const CAM_CONFIG = {
    1: { imgId: "live-image-1", canvasId: "detection-canvas-1", statusId: "ai-status-1" },
    2: { imgId: "live-image-2", canvasId: "detection-canvas-2", statusId: "ai-status-2" },
    3: { imgId: "live-image-3", canvasId: "detection-canvas-3", statusId: "ai-status-3" },
    4: { imgId: "live-image-4", canvasId: "detection-canvas-4", statusId: "ai-status-4" }
};

function initMultiCameraStream(socketUrl) {

    const msgpackLib = window.MessagePack || window.msgpack;

    const socket = new WebSocket(socketUrl);

    // [중요] 바이너리 타입 설정 (MessagePack 디코딩용)
    socket.binaryType = "arraybuffer";

    socket.onopen = function () {
        console.log("통합 CCTV 시스템 접속 완료 (Java Server)");
    };

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

            if (data.img_bytes) {
                const blob = new Blob([data.img_bytes], { type: "image/jpeg" });

                // 메모리 누수 방지: 기존 URL 해제
                if (imgElement.src && imgElement.src.startsWith("blob:")) {
                    URL.revokeObjectURL(imgElement.src);
                }

                imgElement.src = URL.createObjectURL(blob);

                imgElement.onload = function() {
                    updateDisplay(data, imgElement, canvas, ctx, statusElement, camNo);
                };
            }

        } catch (e) {
            console.error("데이터 처리 중 오류 발생:", e);
        }
    };

    socket.onclose = function () {
        console.log("서버 연결 끊김. 재연결 시도...");
        // 필요 시 재연결 로직 추가 (setTimeout 등)
    };

    return socket;
}

function updateDisplay(data, imgElement, canvas, ctx, statusElement, camNo) {
    if (canvas && ctx && canvas.width > 0 && canvas.height > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (typeof drawBoundingBoxesFire === "function") {
        drawBoundingBoxesFire(data, imgElement, canvas, ctx);
    }

    if (statusElement) {
        const fireMap = typeof extractFireMap === "function" ? extractFireMap(data) : data.fire_map;

        if (fireMap && fireMap.length > 0) {
            statusElement.textContent = "🔥 화재 감지 중!";
            statusElement.className = "ai-status text-danger blink"; // 스타일 예시
        } else {
            statusElement.textContent = "정상 감시 중";
            statusElement.className = "ai-status text-success";
        }
    }

    if (typeof checkAndProcessAlerts === "function") {
        const cctvName = `CCTV-0${camNo}`;
        checkAndProcessAlerts(data, cctvName);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // 만약 페이지에 CCTV 화면이 하나라도 있으면 연결 시작
    if (document.getElementById("live-image-1") || document.getElementById("live-image-2")) {
        initMultiCameraStream("ws://localhost:8080/ws/video");
    }
});

//// WebSocket stream initializer (fire_router 전용)
//function initFireCameraStream({ camId = "02", socketUrl, imgId, canvasId, statusId }) {
//  const socket = new WebSocket(socketUrl);
//  const imgElement = document.getElementById(imgId);
//  const canvas = document.getElementById(canvasId);
//  const ctx = canvas.getContext("2d");
//  let lastJsonData = null;
//  socket.binaryType = "blob";
//
//  socket.onopen = function () {
//    console.log(`CCTV-${camId} Java 서버 접속`);
//  };
//
//  function updateFireDisplay() {
//    if (!lastJsonData || lastJsonData.stream_id !== "fire_router") {
//      if (canvas.width > 0 && canvas.height > 0) ctx.clearRect(0, 0, canvas.width, canvas.height);
//      return;
//    }
//    if (typeof drawBoundingBoxesFire === "function") {
//      drawBoundingBoxesFire(lastJsonData, imgElement, canvas, ctx);
//    }
//
//    if (statusId) {
//      const statusElement = document.getElementById(statusId);
//      if (statusElement) {
//        const fireMap = typeof extractFireMap === "function" ? extractFireMap(lastJsonData) : null;
//        if (fireMap && fireMap.length > 0) {
//          statusElement.textContent = "화재 감지 중...";
//          statusElement.className = "ai-status text-cyan";
//        } else {
//          statusElement.textContent = "AI 분석 중...";
//          statusElement.className = "ai-status";
//        }
//      }
//    }
//  }
//
//  socket.onmessage = function (event) {
//    if (typeof event.data === "string") {
//      try {
//        const jsonData = JSON.parse(event.data);
//        if (jsonData.stream_id === "fire_router") {
//          lastJsonData = jsonData;
//          const cctvName = jsonData.cam_id ? `CCTV-${jsonData.cam_id}` : `CCTV-${camId}`;
//          if (typeof checkAndProcessAlerts === "function") {
//            checkAndProcessAlerts(jsonData, cctvName);
//          }
//
//          if (imgElement.complete && imgElement.naturalWidth > 0) {
//            updateFireDisplay();
//          } else {
//            imgElement.onload = function () {
//              updateFireDisplay();
//            };
//          }
//        }
//      } catch (e) {
//        console.error(`CCTV-${camId} JSON 파싱 오류:`, e);
//      }
//    } else if (event.data instanceof Blob) {
//      if (lastJsonData && lastJsonData.stream_id !== "fire_router") return;
//      if (imgElement.src && imgElement.src.startsWith("blob:")) {
//        URL.revokeObjectURL(imgElement.src);
//      }
//      imgElement.src = URL.createObjectURL(event.data);
//      imgElement.onload = function () {
//        updateFireDisplay();
//      };
//    }
//  };
//
//  socket.onclose = function () {
//    console.log(`CCTV-${camId} 서버 연결 끊김`);
//  };
//
//  return { socket, imgElement, canvas, ctx, get lastJsonData() { return lastJsonData; } };
//}
//
//// CCTV-02 기본 초기화 (필요 시 다른 CCTV도 아래처럼 추가)
//if (document.getElementById("live-image-2")) {
//  initFireCameraStream({
//    camId: "02",
//    socketUrl: "ws://localhost:8080/ws/video",
//    imgId: "live-image-2",
//    canvasId: "detection-canvas-2",
//    statusId: "ai-status-2"
//  });
//}

