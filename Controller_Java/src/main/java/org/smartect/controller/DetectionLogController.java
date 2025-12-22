package org.smartect.controller;

import lombok.RequiredArgsConstructor;
import org.smartect.dto.CombinedJsonDTO;
import org.smartect.service.LogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/detection-log")
@RequiredArgsConstructor
public class DetectionLogController {

    private final LogService logService;

    @PostMapping("/save")
    public ResponseEntity<String> saveDetectionLog(@RequestBody CombinedJsonDTO data) {
        try {
            logService.saveDailyDetectionLog(data);
            return ResponseEntity.ok("로그 저장 완료");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("로그 저장 실패: " + e.getMessage());
        }
    }
}

