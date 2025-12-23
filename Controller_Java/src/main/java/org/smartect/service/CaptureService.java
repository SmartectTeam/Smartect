package org.smartect.service;

import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class CaptureService {

    private static final String SHARED_FOLDER_PATH = "\\\\220-29\\공유폴더\\captures";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HHmmss");

    /**
     * 알람 발생 시 CCTV 화면 캡쳐 저장
     * @param imageBytes 이미지 바이트 배열 (Base64 디코딩된)
     * @param camNo 카메라 번호
     * @param eventType 이벤트 타입 (fire, smoke 등)
     * @return 저장된 파일 경로
     */
    public String saveAlertCapture(byte[] imageBytes, int camNo, String eventType) {
        try {
            // 공유 폴더 경로 확인 및 생성
            Path sharedPath = Paths.get(SHARED_FOLDER_PATH);
            if (!Files.exists(sharedPath)) {
                try {
                    Files.createDirectories(sharedPath);
                } catch (IOException e) {
                    // 공유 폴더 접근 실패 시 로컬 경로로 대체
                    return saveToLocalPath(imageBytes, camNo, eventType);
                }
            }

            // 날짜별 폴더 생성
            String dateStr = LocalDateTime.now().format(DATE_FORMATTER);
            Path dateFolder = sharedPath.resolve(dateStr);
            if (!Files.exists(dateFolder)) {
                Files.createDirectories(dateFolder);
            }

            // 파일명 생성: CCTV-XX_이벤트타입_YYYY-MM-DD_HHmmss.jpg
            String timeStr = LocalDateTime.now().format(TIME_FORMATTER);
            String fileName = String.format("CCTV-%02d_%s_%s_%s.jpg", camNo, eventType, dateStr, timeStr);
            File captureFile = dateFolder.resolve(fileName).toFile();

            // 이미지 저장
            ByteArrayInputStream bais = new ByteArrayInputStream(imageBytes);
            BufferedImage image = ImageIO.read(bais);
            if (image != null) {
                ImageIO.write(image, "jpg", captureFile);
                return captureFile.getAbsolutePath();
            } else {
                // 이미지 파싱 실패 시 원본 바이트 그대로 저장
                Files.write(captureFile.toPath(), imageBytes);
                return captureFile.getAbsolutePath();
            }

        } catch (IOException e) {
            // 공유 폴더 저장 실패 시 로컬 경로로 대체
            return saveToLocalPath(imageBytes, camNo, eventType);
        }
    }

    /**
     * 공유 폴더 접근 실패 시 로컬 경로에 저장
     */
    private String saveToLocalPath(byte[] imageBytes, int camNo, String eventType) {
        try {
            String localPath = "captures";
            Path localDir = Paths.get(localPath);
            if (!Files.exists(localDir)) {
                Files.createDirectories(localDir);
            }

            String dateStr = LocalDateTime.now().format(DATE_FORMATTER);
            Path dateFolder = localDir.resolve(dateStr);
            if (!Files.exists(dateFolder)) {
                Files.createDirectories(dateFolder);
            }

            String timeStr = LocalDateTime.now().format(TIME_FORMATTER);
            String fileName = String.format("CCTV-%02d_%s_%s_%s.jpg", camNo, eventType, dateStr, timeStr);
            File captureFile = dateFolder.resolve(fileName).toFile();

            ByteArrayInputStream bais = new ByteArrayInputStream(imageBytes);
            BufferedImage image = ImageIO.read(bais);
            if (image != null) {
                ImageIO.write(image, "jpg", captureFile);
            } else {
                Files.write(captureFile.toPath(), imageBytes);
            }

            return captureFile.getAbsolutePath();
        } catch (IOException e) {
            System.err.println("캡쳐 저장 실패: " + e.getMessage());
            return null;
        }
    }
}