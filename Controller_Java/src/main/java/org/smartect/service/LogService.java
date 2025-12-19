package org.smartect.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.smartect.dto.CombinedJsonDTO;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class LogService {

    private static final String LOG_DIR = "logs/detection";
    private final ObjectMapper objectMapper;

    public LogService() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        
        // 로그 디렉토리 생성
        try {
            Path logPath = Paths.get(LOG_DIR);
            if (!Files.exists(logPath)) {
                Files.createDirectories(logPath);
            }
        } catch (IOException e) {
        }
    }

    /**
     * 일일 로그 파일로 저장 (같은 날짜의 로그를 하나의 파일에 누적)
     * @param data CombinedJsonDTO 객체
     */
    public void saveDailyDetectionLog(CombinedJsonDTO data) {
        if (data == null) {
            return;
        }

        // fire_map이나 fire_json이 비어있으면 저장하지 않음
        boolean hasFireData = (data.getFire_map() != null && !data.getFire_map().isEmpty()) ||
                             (data.getFire_json() != null && !data.getFire_json().isEmpty());
        boolean hasActionData = (data.getAction_map() != null && !data.getAction_map().isEmpty()) ||
                               (data.getAction_json() != null && !data.getAction_json().isEmpty());

        if (!hasFireData && !hasActionData) {
            return; // 감지 데이터가 없으면 저장하지 않음
        }

        try {
            // 파일명: detection_YYYY-MM-DD_CCTV-X.json (일일 로그)
            String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            String fileName = String.format("detection_%s_CCTV-%02d.txt", date, data.getCam_no());
            File logFile = new File(LOG_DIR, fileName);

            // 타임스탬프 추가
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            
            // JSON으로 변환
            String jsonString = objectMapper.writeValueAsString(data);
            
            // 타임스탬프와 함께 저장
            try (FileWriter writer = new FileWriter(logFile, true)) {
                writer.write(String.format("[%s] ", timestamp));
                writer.write(jsonString);
                writer.write("\n");
            }

        } catch (IOException e) {
        }
    }
}

