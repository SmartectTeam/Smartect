package org.smartect.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class CaptureService {

    private static final String CAPTURE_BASE_PATH = "\\\\220-29\\공유폴더\\captures";

    /**
     * 원본 프레임에 바운딩 박스를 그려서 캡처 저장
     */
    public String captureWithBoundingBox(
            byte[] frameBytes,
            int camNo,
            String eventType,
            int x1, int y1, int x2, int y2,
            double confidence) {

        try {
            // 1. byte[]를 BufferedImage로 변환
            ByteArrayInputStream bais = new ByteArrayInputStream(frameBytes);
            BufferedImage image = ImageIO.read(bais);

            if (image == null) {
                System.err.println("이미지 디코딩 실패");
                return null;
            }

            // 2. Graphics2D로 바운딩 박스 그리기
            Graphics2D g2d = image.createGraphics();

            // 안티앨리어싱 설정
            g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            // 바운딩 박스 색상 설정 (이벤트 타입에 따라)
            Color boxColor = getColorByEventType(eventType);
            g2d.setColor(boxColor);
            g2d.setStroke(new BasicStroke(3));

            // 사각형 그리기
            int width = x2 - x1;
            int height = y2 - y1;
            g2d.drawRect(x1, y1, width, height);

            // 라벨 텍스트 (이벤트 타입 + 신뢰도)
            String label = String.format("%s (%.2f%%)", eventType, confidence * 100);
            g2d.setFont(new Font("Arial", Font.BOLD, 16));

            // 텍스트 배경
            FontMetrics fm = g2d.getFontMetrics();
            int labelWidth = fm.stringWidth(label);
            int labelHeight = fm.getHeight();
            g2d.fillRect(x1, y1 - labelHeight - 5, labelWidth + 10, labelHeight + 5);

            // 텍스트
            g2d.setColor(Color.WHITE);
            g2d.drawString(label, x1 + 5, y1 - 5);

            g2d.dispose();

            // 3. 파일로 저장
            String fileName = generateFileName(camNo, eventType);
            String fullPath = saveImageToFile(image, fileName);

            return fullPath;

        } catch (Exception e) {
            System.err.println("캡처 저장 실패: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    /**
     * 이벤트 타입에 따른 색상 반환
     */
    private Color getColorByEventType(String eventType) {
        String lower = eventType.toLowerCase();

        if (lower.contains("fire")) return Color.RED;
        if (lower.contains("smoke")) return Color.ORANGE;
        if (lower.contains("fall")) return Color.MAGENTA;
        if (lower.contains("threat")) return Color.RED;
        if (lower.contains("punching") || lower.contains("pushing")) return Color.YELLOW;

        return Color.GREEN; // 기본값
    }

    /**
     * 파일명 생성
     */
    private String generateFileName(int camNo, String eventType) {
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmmss");
        return String.format("CAM%02d_%s_%s.jpg",
                camNo,
                eventType,
                now.format(formatter));
    }

    /**
     * 이미지를 파일로 저장
     */
    private String saveImageToFile(BufferedImage image, String fileName) throws IOException {
        // 날짜별 폴더 생성
        LocalDateTime now = LocalDateTime.now();
        String dateFolder = now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String folderPath = CAPTURE_BASE_PATH + File.separator + dateFolder;

        File folder = new File(folderPath);
        if (!folder.exists()) {
            folder.mkdirs();
        }

        // 파일 저장
        String fullPath = folderPath + File.separator + fileName;
        File outputFile = new File(fullPath);
        ImageIO.write(image, "jpg", outputFile);

        return fullPath;
    }
}