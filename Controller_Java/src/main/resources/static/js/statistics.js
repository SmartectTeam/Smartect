// 전역 변수로 차트 객체 선언 (나중에 접근 가능하도록)
let barChart, pieChart, lineChart, heatMapChart;
window.onload = function() {
// 1. 날짜 입력 필드 초기값 설정 (HTML에서 선언된 전역 변수 사용)
    if (typeof serverStartDate !== 'undefined' && serverStartDate) {
        document.getElementById('startDate').value = serverStartDate;
    }
    if (typeof serverEndDate !== 'undefined' && serverEndDate) {
        document.getElementById('endDate').value = serverEndDate;
    }
// 2. 선택된 기간에 따른 버튼 활성화 로직
    const diff = new Date(serverEndDate) - new Date(serverStartDate);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const btns = document.querySelectorAll('.custom-btn');
    btns.forEach(b => b.classList.remove('active'));

    if (days === 0) btns[0].classList.add('active');
    else if (days === 7) btns[1].classList.add('active');
    else if (days === 30) btns[2].classList.add('active');
// 3. KPI 및 AI 인사이트 업데이트
    updateKPI(realBarData, realPieData, realLineData);
    const insights = getAIAnalysis(realBarData, realPieData, realLineData);
    const insightBox = document.getElementById('ai-insight-content');
    if (insightBox) {
        insightBox.innerHTML = insights.join('<br>');
    }
// 4. 차트 초기화 실행 (데이터 로드 완료 후 안전하게 호출)
    initAllCharts();
};
// 모든 차트를 초기화하는 함수
function initAllCharts() {
    Chart.defaults.color = '#fff';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.font.family = 'sans-serif';
// [1] 바 차트 (6개 항목)
    const ctxBar = document.getElementById("myBarChart");
    if (ctxBar) {
        barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ["화재", "연기", "펀칭", "푸싱", "리칭", "터치"],
                datasets: [{
                    label: "건수",
                    backgroundColor: ['#ff4d4d', '#fd7e14', '#fcc419', '#748ffc', '#63e6be', '#adb5bd'],
                    data: realBarData,
                }],
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { x: { ticks: { color: 'white' }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: 'white' } } } }
        });
    }
// [2] 파이 차트 (DB 카메라 이름 동적 반영)
    const ctxPie = document.getElementById("myPieChart");
    if (ctxPie) {
        pieChart = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
// HTML에서 받아온 dbCamLabels 사용
                labels: (typeof dbCamLabels !== 'undefined') ? dbCamLabels : ["카메라1", "카메라2", "카메라3"],
                datasets: [{
                    data: realPieData,
                    backgroundColor: ['#0d6efd', '#dc3545', '#ffc107', '#20c997'],
                    borderColor: '#1c2128',
                }],
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: 'white', boxWidth: 12 } } } }
        });
    }
// [3] 라인 차트 (위험도 변화)
    const ctxLine = document.getElementById("myLineChart");
    if (ctxLine) {
        lineChart = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => i + "시"),
                datasets: [{
                    label: "종합 위험 지수",
                    tension: 0.3,
                    backgroundColor: "rgba(13, 110, 253, 0.2)",
                    borderColor: "#0d6efd",
                    pointBackgroundColor: "#0d6efd",
                    fill: true,
                    data: realLineData,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `종합 위험도: ${context.raw}점`;
                            }
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: 'white' }, grid: { display: false } },
                    y: { beginAtZero: true, ticks: { color: 'white' }, title: { display: true, text: 'Risk Score', color: '#666' } }
                }
            }
        });
    }
}
function updateKPI(barData, pieData, lineData) {
    const eventLabels = ["화재", "연기", "펀칭", "푸싱", "리칭", "터치"];
// DB 카메라 이름 사용
    const camNames = (typeof dbCamLabels !== 'undefined') ? dbCamLabels : ["카메라1", "카메라2", "카메라3"];
    const total = barData.reduce((a, b) => a + b, 0);
    const maxEventIdx = barData.indexOf(Math.max(...barData));
    const maxCamIdx = pieData.indexOf(Math.max(...pieData));
    const maxTimeIdx = lineData.indexOf(Math.max(...lineData));
    document.getElementById('kpi-total').innerText = total + "건";
    document.getElementById('kpi-type').innerText = eventLabels[maxEventIdx] || "-";
    document.getElementById('kpi-zone').innerText = camNames[maxCamIdx] || "-";
    document.getElementById('kpi-time').innerText = maxTimeIdx + ":00";
}
function getAIAnalysis(barData, pieData, lineData) {
    const eventLabels = ["화재", "연기", "펀칭", "푸싱", "리칭", "터치"];
    const camNames = (typeof dbCamLabels !== 'undefined') ? dbCamLabels : ["카메라1", "카메라2", "카메라3"];
    let insights = [];
    let maxEventIdx = barData.indexOf(Math.max(...barData));
    let maxEventCount = barData[maxEventIdx];
    insights.push(`1. <strong>위험 감지:</strong> 현재 <strong>'${eventLabels[maxEventIdx]}'</strong> 이벤트가 가장 빈번하게 발생했습니다 (총 ${maxEventCount}건).`);
    let maxCamIdx = pieData.indexOf(Math.max(...pieData));
    let totalCamEvents = pieData.reduce((a, b) => a + b, 0);
    let camPercentage = totalCamEvents > 0 ? ((pieData[maxCamIdx] / totalCamEvents) * 100).toFixed(1) : 0;
    insights.push(`2. <strong>주요 발생 구역:</strong> 전체 알림의 ${camPercentage}%가 <strong>${camNames[maxCamIdx]}</strong> 구역에서 감지되었습니다.`);

    let maxLineVal = Math.max(...lineData);
    let maxHour = lineData.indexOf(maxLineVal);
    insights.push(`3. <strong>시간대 분석:</strong> ${maxHour}시 경에 가장 많은 위험 신호(${maxLineVal}건)가 집중되었습니다.`);

    let totalEvents = barData.reduce((a, b) => a + b, 0);
    if (totalEvents > 100) {
        insights.push(`4. <strong>종합 평가:</strong> 보안 이벤트 발생량이 많습니다(${totalEvents}건). <strong>즉각적인 현장 점검</strong>이 권장됩니다.`);
    } else {
        insights.push(`4. <strong>종합 평가:</strong> 전체적인 보안 상태는 비교적 안정적입니다.`);
    }
    return insights;
}
// 히트맵 초기화 함수
function initHeatMap() {
    const ctxHeat = document.getElementById("myHeatMap");
    if (!ctxHeat) return;
    function processHeatMapData(dbList) {
        const fullData = [];
        const days = ['일', '토', '금', '목', '수', '화', '월'];
        days.forEach(dayStr => {
            for (let h = 0; h < 24; h++) {
                fullData.push({ x: h + "시", y: dayStr, v: 0 });
            }
        });
        if (dbList && dbList.length > 0) {
            dbList.forEach(item => {
                const target = fullData.find(cell => cell.y === item.day && cell.x === (item.hour + "시"));
                if (target) target.v = item.score;
            });
        }
        return fullData;
    }
    const finalHeatMapData = processHeatMapData(realHeatMapList);
    const maxScore = Math.max(...finalHeatMapData.map(d => d.v));

    heatMapChart = new Chart(ctxHeat, {
        type: 'matrix',
        data: {
            datasets: [{
                label: '위험 감지 히트맵',
                data: finalHeatMapData,
                backgroundColor: function(c) {
                    const value = c.raw.v;
                    if (value === 0) return 'rgba(255, 255, 255, 0.05)';
                    let alpha = (value / (maxScore || 1)) * 0.85 + 0.15;
                    return `rgba(255, 77, 77, ${alpha})`;
                },
                borderColor: '#2b3035',
                borderWidth: 1,
                width: ({chart}) => (chart.chartArea || {}).width / 24 - 1,
                height: ({chart}) => (chart.chartArea || {}).height / 7 - 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: () => '',
                        label: (context) => {
                            const v = context.raw;
                            return `${v.y}요일 ${v.x}: 위험도 ${v.v}`;
                        }
                    }
                }
            },
            scales: {
                x: { type: 'category', labels: Array.from({length: 24}, (_, i) => i + "시"), ticks: { color: 'white', font: { size: 10 } }, grid: { display: false } },
                y: { type: 'category', labels: ['월', '화', '수', '목', '금', '토', '일'], offset: true, ticks: { color: 'white', font: { weight: 'bold' } }, grid: { display: false } }
            }
        }
    });
}
function refreshCharts() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    location.href = '/statistics?startDate=' + start + '&endDate=' + end;
}
function setPeriod(days) {
    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() - days);
    let endStr = today.toISOString().split('T')[0];
    let startStr = targetDate.toISOString().split('T')[0];
    if (days === 0) startStr = endStr;
    location.href = '/statistics?startDate=' + startStr + '&endDate=' + endStr;
}
async function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const element = document.querySelector("#pdf-area");
    const btnPanel = document.querySelector("#control-panel");
    const webHeader = document.querySelector("#web-header");
    const pdfHeader = document.querySelector("#pdf-only-header");
    const dateRangeText = document.querySelector("#pdf-date-range");
    const genDateText = document.querySelector("#pdf-gen-date");

    try {
        // 1. [UI 변경] 리포트 모드로 전환
        btnPanel.style.display = 'none';
        webHeader.style.display = 'none';

        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        dateRangeText.innerText = `조회 기간: ${startDate} ~ ${endDate}`;

        const now = new Date();
        const formattedNow = now.getFullYear() + "-" +
            String(now.getMonth() + 1).padStart(2, '0') + "-" +
            String(now.getDate()).padStart(2, '0') + " " +
            String(now.getHours()).padStart(2, '0') + ":" +
            String(now.getMinutes()).padStart(2, '0');
        genDateText.innerText = `리포트 생성일: ${formattedNow}`;

        pdfHeader.style.display = 'block';

        // 2. [캡처] html2canvas 실행
        const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: "#212529",
            useCORS: true,
            logging: false // 불필요한 로그 끄기
        });
        const imgData = canvas.toDataURL('image/png');

        // 3. [PDF 생성]
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10;
        const footerHeight = 15;

        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2) - footerHeight;

        let imgWidth = maxWidth;
        let imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = (canvas.width * imgHeight) / canvas.height;
        }

        const xPos = (pageWidth - imgWidth) / 2;
        const yPos = margin + 5;

        pdf.setFillColor(33, 37, 41);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);

        pdf.setFontSize(9);
        pdf.setTextColor(130, 130, 130);
        pdf.text("Generated by Smartect AI Monitoring System | Confidential", pageWidth / 2, pageHeight - 10, { align: "center" });

        pdf.save(`Smartect_Report_${endDate}.pdf`);

    } catch (error) {
        console.error("PDF 생성 중 오류 발생:", error);
        alert("PDF 생성 중 오류가 발생했습니다. 개발자 도구(F12) 콘솔을 확인해주세요.");
    } finally {
        btnPanel.style.display = 'flex';
        webHeader.style.display = 'block';
        pdfHeader.style.display = 'none';

        // 스크롤이 맨 위로 튀는 현상 방지용
        window.scrollTo(0, window.scrollY);
    }
}
async function downloadExcel() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('SMARTECT 보안 리포트');
// 1. 기본 컬럼 너비 설정
    sheet.columns = [
        { width: 20 }, { width: 15 }, { width: 5 },  // A, B, C
        { width: 20 }, { width: 15 }, { width: 5 },  // D, E, F
        { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 } // 히트맵용 G~L
    ];

// --- [스타일 공통 설정] ---
    const colors = {
        main: 'FF1A1C21',    // 진한 다크그레이 (헤더용)
        accent: 'FF0D6EFD',  // 포인트 블루
        border: 'FFD1D1D1',  // 테두리 회색
        white: 'FFFFFFFF',
        danger: 'FFFF4D4D',
        warning: 'FFFCC419',
        safe: 'FF20C997'
    };

    const thinBorder = {
        top: { style: 'thin', color: { argb: colors.border } },
        left: { style: 'thin', color: { argb: colors.border } },
        bottom: { style: 'thin', color: { argb: colors.border } },
        right: { style: 'thin', color: { argb: colors.border } }
    };

// --- 2. 메인 타이틀 & 리포트 정보 ---
    sheet.mergeCells('A1:E2');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'SMARTECT AI 감지 분석 리포트';
    titleCell.font = { size: 18, bold: true, color: { argb: colors.white } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.main } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('A3:E3');
    const dateCell = sheet.getCell('A3');
    dateCell.value = `조회 기간: ${document.getElementById('startDate').value} ~ ${document.getElementById('endDate').value}  |  생성일: ${new Date().toLocaleDateString()}`;
    dateCell.font = { size: 10, color: { argb: 'FF666666' } };
    dateCell.alignment = { horizontal: 'right' };

// --- 3. KPI 요약 섹션 (까리한 포인트 1) ---
    const totalEvents = realBarData.reduce((a, b) => a + b, 0);
    const kpiData = [
        ['총 감지 건수', totalEvents + '건'],
        ['주요 위험 유형', document.getElementById('kpi-type').innerText],
        ['최고 위험 구역', document.getElementById('kpi-zone').innerText]
    ];

    let kpiCol = 1;
    kpiData.forEach((kpi, idx) => {
        const cellLabel = sheet.getCell(5, kpiCol);
        const cellVal = sheet.getCell(6, kpiCol);

        cellLabel.value = kpi[0];
        cellLabel.font = { bold: true, color: { argb: 'FF444444' } };
        cellLabel.alignment = { horizontal: 'center' };

        cellVal.value = kpi[1];
        cellVal.font = { size: 14, bold: true, color: { argb: colors.accent } };
        cellVal.alignment = { horizontal: 'center' };
        cellVal.border = thinBorder;

        kpiCol += 2;
    });

// --- 4. 데이터 테이블 헤더 스타일 함수 ---
    const setTableHeader = (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF343A40' } };
        cell.font = { bold: true, color: { argb: colors.white } };
        cell.alignment = { horizontal: 'center' };
        cell.border = thinBorder;
    };

// --- 5. [좌측] 이벤트 유형별 발생 빈도 ---
    let currentRow = 8;
    sheet.getCell(`A${currentRow}`).value = '■ 이벤트 유형별 통계';
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
    currentRow++;

    const eventLabels = ["화재 (FIRE)", "연기 (SMOKE)", "침입 (ACCESS)", "이상행동 (SUSPICIOUS)"];
    setTableHeader(sheet.getCell(`A${currentRow}`));
    setTableHeader(sheet.getCell(`B${currentRow}`));
    sheet.getCell(`A${currentRow}`).value = '항목';
    sheet.getCell(`B${currentRow}`).value = '지수/건수';
    currentRow++;

    eventLabels.forEach((label, idx) => {
        sheet.getCell(`A${currentRow}`).value = label;
        sheet.getCell(`B${currentRow}`).value = realBarData[idx];
        sheet.getCell(`A${currentRow}`).border = thinBorder;
        sheet.getCell(`B${currentRow}`).border = thinBorder;

        // 위험도에 따른 텍스트 강조
        if (label.includes('FIRE')) sheet.getCell(`B${currentRow}`).font = { color: { argb: colors.danger }, bold: true };
        currentRow++;
    });

// --- 6. [우측] 카메라별 감지 비율 (A 옆 D열에 배치) ---
    let camRow = 9;
    setTableHeader(sheet.getCell(`D${camRow}`));
    setTableHeader(sheet.getCell(`E${camRow}`));
    sheet.getCell(`D${camRow}`).value = '카메라 위치';
    sheet.getCell(`E${camRow}`).value = '감지 건수';
    camRow++;

    const camLabels = ["Camera 1 (교실)", "Camera 2 (복도)", "Camera 3 (창고)"];
    camLabels.forEach((label, idx) => {
        sheet.getCell(`D${camRow}`).value = label;
        sheet.getCell(`E${camRow}`).value = realPieData[idx];
        sheet.getCell(`D${camRow}`).border = thinBorder;
        sheet.getCell(`E${camRow}`).border = thinBorder;
        camRow++;
    });

// --- 7. 시간대별 위험 지수 (하단 배치) ---
    currentRow = Math.max(currentRow, camRow) + 2;
    sheet.getCell(`A${currentRow}`).value = '■ 시간대별 위험도 변화 (24H)';
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
    currentRow++;

// 헤더
    ['A', 'B', 'D', 'E'].forEach(col => setTableHeader(sheet.getCell(`${col}${currentRow}`)));
    sheet.getCell(`A${currentRow}`).value = '시간'; sheet.getCell(`B${currentRow}`).value = '지수';
    sheet.getCell(`D${currentRow}`).value = '시간'; sheet.getCell(`E${currentRow}`).value = '지수';
    currentRow++;

    for (let i = 0; i < 12; i++) {
        const r = sheet.getRow(currentRow);
        // 오전
        r.getCell(1).value = i + "시"; r.getCell(2).value = realLineData[i];
        r.getCell(1).border = thinBorder; r.getCell(2).border = thinBorder;
        // 오후
        r.getCell(4).value = (i+12) + "시"; r.getCell(5).value = realLineData[i+12];
        r.getCell(4).border = thinBorder; r.getCell(5).border = thinBorder;
        currentRow++;
    }

// --- 8. [대망의 포인트] 최근 5개 로그 상세 (까리한 포인트 2) ---
    currentRow += 2;
    sheet.getCell(`A${currentRow}`).value = '■ 최근 상세 로그 (Recent 5)';
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
    currentRow++;

    const logHeaders = ['발생 시각', '카메라', '이벤트', '위험도', '상태'];
    sheet.mergeCells(`A${currentRow}:B${currentRow}`); // 시간은 좀 넓게
    logHeaders.forEach((h, i) => {
        const cell = sheet.getCell(currentRow, i + (i > 0 ? 2 : 1));
        // A(1), C(3), D(4), E(5), F(6) 이런식으로 매칭 (중간 공백 고려)
    });
// 단순화를 위해 그냥 순서대로 배치
    const tableCols = ['A', 'B', 'C', 'D', 'E'];
    tableCols.forEach((col, idx) => {
        const cell = sheet.getCell(`${col}${currentRow}`);
        cell.value = logHeaders[idx];
        setTableHeader(cell);
    });
    currentRow++;

// 실제 웹의 테이블 데이터를 긁어와서 삽입
    const tableRows = document.querySelectorAll('#log-table-body tr');
    tableRows.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        tds.forEach((td, idx) => {
            const cell = sheet.getCell(`${tableCols[idx]}${currentRow}`);
            cell.value = td.innerText;
            cell.border = thinBorder;
            cell.alignment = { horizontal: 'center' };
            // 위험도 컬러링
            if (idx === 3 && td.innerText.includes('높음')) cell.font = { color: { argb: colors.danger }, bold: true };
            if (idx === 3 && td.innerText.includes('안전')) cell.font = { color: { argb: colors.safe } };
        });
        currentRow++;
    });

// 9. 파일 생성
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Smartect_Analysis_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
}
// 2. DB 데이터를 차트 포맷에 맞게 변환 및 빈 시간대 채우기
function processHeatMapData(dbList) {
    const fullData = [];
    const days = ['일', '토', '금', '목', '수', '화', '월']; // Y축 순서 (일요일이 맨 밑 혹은 맨 위, 취향껏 조정)
// 보통 월~일 순서라면: ['월', '화', '수', '목', '금', '토', '일']
// (1) 일단 모든 요일/시간을 0(안전)으로 초기화해서 격자를 만듭니다.
// days 배열에 있는 요일들로 루프
    days.forEach(dayStr => {
        for (let h = 0; h < 24; h++) {
            fullData.push({
                x: h + "시",   // X축 라벨 (0시 ~ 23시)
                y: dayStr,     // Y축 라벨 (월 ~ 일)
                v: 0           // 기본값 0
            });
        }
    });

// (2) DB에 데이터가 있다면, 해당 위치의 값을 덮어씁니다.
    if (dbList && dbList.length > 0) {
        dbList.forEach(item => {
            // item.day: "월", item.hour: 14, item.score: 5

            // 일치하는 칸 찾기
            const target = fullData.find(cell =>
                cell.y === item.day && cell.x === (item.hour + "시")
            );

            if (target) {
                target.v = item.score; // 위험도 점수 적용
            }
        });
    }
    return fullData;
}
// 3. 변환된 데이터를 차트에 넣을 준비
const finalHeatMapData = processHeatMapData(realHeatMapList);
// 4. 차트 생성 (data 부분을 finalHeatMapData로 변경)
const maxScore = Math.max(...finalHeatMapData.map(d => d.v));
new Chart(document.getElementById("myHeatMap"), {
    type: 'matrix',
    data: {
        datasets: [{
            label: '위험 감지 히트맵',
            data: finalHeatMapData,
            backgroundColor: function(c) {
                const value = c.raw.v;
                if (value === 0) return 'rgba(255, 255, 255, 0.05)'; // 0점은 투명
// [핵심 변경] 최대값 기준 비율로 계산 (상대 평가)
                // 예: 최대 점수가 5000점이면, 5000점인 곳이 진한 빨강, 2500점은 중간 빨강
                // 최소 가시성을 위해 0.15는 깔고 들어감
                let alpha = (value / maxScore) * 0.85 + 0.15;

                return `rgba(255, 77, 77, ${alpha})`;
            },
            borderColor: '#2b3035',
            borderWidth: 1,
            width: ({chart}) => (chart.chartArea || {}).width / 24 - 1,
            height: ({chart}) => (chart.chartArea || {}).height / 7 - 1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: () => '',
                    label: (context) => {
                        const v = context.raw;
                        // 툴팁에 점수와 함께 비율도 보여주면 좋음
                        const percent = maxScore > 0 ? Math.round((v.v / maxScore) * 100) : 0;
                        return `${v.y}요일 ${v.x}: 위험도 ${v.v} (${percent}%)`;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'category',
                labels: Array.from({length: 24}, (_, i) => i + "시"),
                ticks: { color: 'white', font: { size: 10 } },
                grid: { display: false }
            },
            y: {
                type: 'category',
                labels: ['월', '화', '수', '목', '금', '토', '일'],
                offset: true,
                ticks: { color: 'white', font: { weight: 'bold' } },
                grid: { display: false }
            }
        }
    }
});