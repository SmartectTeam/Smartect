// 박스 렌더링 (fire_router CombinedJson 대응)
function drawBoundingBoxesFire(jsonData, imgElement, canvas, ctx) {

  if (!imgElement.complete || imgElement.naturalWidth === 0 || imgElement.naturalHeight === 0) {
    console.log("drawBoundingBoxesFire: 이미지가 아직 로드되지 않음");
    return;
  }

  const fireMap = typeof extractFireMap === "function" ? extractFireMap(jsonData) : null;

  if (!Array.isArray(fireMap)) {
    if (canvas.width > 0 && canvas.height > 0) ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  if (fireMap.length === 0) {
    if (canvas.width > 0 && canvas.height > 0) ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  canvas.width = imgElement.offsetWidth || imgElement.clientWidth;
  canvas.height = imgElement.offsetHeight || imgElement.clientHeight;
  if (canvas.width === 0 || canvas.height === 0) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const naturalWidth = imgElement.naturalWidth;
  const naturalHeight = imgElement.naturalHeight;
  if (naturalWidth === 0 || naturalHeight === 0) return;

  const scaleX = canvas.width / naturalWidth;
  const scaleY = canvas.height / naturalHeight;

  fireMap.forEach(box => {
    if (typeof box.x1 !== "number" || typeof box.y1 !== "number" ||
        typeof box.x2 !== "number" || typeof box.y2 !== "number") return;

    const x1 = box.x1 * scaleX;
    const y1 = box.y1 * scaleY;
    const x2 = box.x2 * scaleX;
    const y2 = box.y2 * scaleY;
    const width = x2 - x1;
    const height = y2 - y1;

    const boxClass = box.class || box.event_type || "unknown";
    const isFire = boxClass === "fire";
    const color = isFire ? "#FF0000" : "#FF8C00";

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x1, y1, width, height);

    const label = boxClass;
    ctx.font = "bold 14px Arial";
    const textMetrics = ctx.measureText(label);
    const labelWidth = textMetrics.width + 10;
    const labelHeight = 20;

    ctx.fillStyle = color;
    ctx.fillRect(x1, y1 - labelHeight, labelWidth, labelHeight);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(label, x1 + 5, y1 - 5);
  });
}

