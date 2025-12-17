// WebSocket stream initializer (fire_router 전용)
function initFireCameraStream({ camId = "02", socketUrl, imgId, canvasId, statusId }) {
  const socket = new WebSocket(socketUrl);
  const imgElement = document.getElementById(imgId);
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  let lastJsonData = null;
  socket.binaryType = "blob";

  socket.onopen = function () {
    console.log(`CCTV-${camId} Java 서버 접속`);
  };

  function updateFireDisplay() {
    if (!lastJsonData || lastJsonData.stream_id !== "fire_router") {
      if (canvas.width > 0 && canvas.height > 0) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    if (typeof drawBoundingBoxesFire === "function") {
      drawBoundingBoxesFire(lastJsonData, imgElement, canvas, ctx);
    }

    if (statusId) {
      const statusElement = document.getElementById(statusId);
      if (statusElement) {
        const fireMap = typeof extractFireMap === "function" ? extractFireMap(lastJsonData) : null;
        if (fireMap && fireMap.length > 0) {
          statusElement.textContent = "화재 감지 중...";
          statusElement.className = "ai-status text-cyan";
        } else {
          statusElement.textContent = "AI 분석 중...";
          statusElement.className = "ai-status";
        }
      }
    }
  }

  socket.onmessage = function (event) {
    if (typeof event.data === "string") {
      try {
        const jsonData = JSON.parse(event.data);
        if (jsonData.stream_id === "fire_router") {
          lastJsonData = jsonData;
          const cctvName = jsonData.cam_id ? `CCTV-${jsonData.cam_id}` : `CCTV-${camId}`;
          if (typeof checkAndProcessAlerts === "function") {
            checkAndProcessAlerts(jsonData, cctvName);
          }

          if (imgElement.complete && imgElement.naturalWidth > 0) {
            updateFireDisplay();
          } else {
            imgElement.onload = function () {
              updateFireDisplay();
            };
          }
        }
      } catch (e) {
        console.error(`CCTV-${camId} JSON 파싱 오류:`, e);
      }
    } else if (event.data instanceof Blob) {
      if (lastJsonData && lastJsonData.stream_id !== "fire_router") return;
      if (imgElement.src && imgElement.src.startsWith("blob:")) {
        URL.revokeObjectURL(imgElement.src);
      }
      imgElement.src = URL.createObjectURL(event.data);
      imgElement.onload = function () {
        updateFireDisplay();
      };
    }
  };

  socket.onclose = function () {
    console.log(`CCTV-${camId} 서버 연결 끊김`);
  };

  return { socket, imgElement, canvas, ctx, get lastJsonData() { return lastJsonData; } };
}

// CCTV-02 기본 초기화 (필요 시 다른 CCTV도 아래처럼 추가)
if (document.getElementById("live-image-2")) {
  initFireCameraStream({
    camId: "02",
    socketUrl: "ws://localhost:8080/ws/video",
    imgId: "live-image-2",
    canvasId: "detection-canvas-2",
    statusId: "ai-status-2"
  });
}

