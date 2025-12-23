package org.smartect.controller;

import lombok.RequiredArgsConstructor;
import org.smartect.dto.CombinedJsonDTO;
import org.smartect.dto.EventJsonDTO;
import org.smartect.service.EventLogService;
import org.smartect.service.EventReliabilityService;
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
    private final EventLogService eventLogService;
    private final EventReliabilityService reliabilityService;

    // 컨트롤러는 이벤트 수신만을 담당
    // DB 저장 판단은 Service(+handler)
    @PostMapping("/save")
    public ResponseEntity<String> saveDetectionLog(@RequestBody CombinedJsonDTO data) {
        try {
            // 파일 로그 저장 , SAFE 이벤트 필터링(저장X)
            CombinedJsonDTO filteredData = filterSafeEvents(data);
            logService.saveDailyDetectionLog(filteredData);

            // Service로 JSON 전달
            // 신뢰도 판단 / 중복방지 -> EventReliabilityService
            if (data.getFire_json() != null) {
                for (EventJsonDTO event : data.getFire_json()) {
                    reliabilityService.process(event);
                }
            }

            if (data.getAction_json() != null) {
                for (EventJsonDTO event : data.getAction_json()) {
                    reliabilityService.process(event);
                }
            }
            return ResponseEntity.ok("로그 수신 완료");
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("로그 처리 실패: " + e.getMessage());
        }
    }

    // SAFE 이벤트 필터링 한 CombinedJsonDTO 전달
    private CombinedJsonDTO filterSafeEvents(CombinedJsonDTO data) {
        CombinedJsonDTO filtered = new CombinedJsonDTO();
        filtered.setType(data.getType());
        filtered.setCam_no(data.getCam_no());
        filtered.setImg_bytes(data.getImg_bytes());

        // fire_json에서 "Safe" 제외
        if (data.getFire_json() != null) {
            filtered.setFire_json(data.getFire_json().stream()
                    .filter(event -> !"Safe".equalsIgnoreCase(event.getEvent_type()))
                    .collect(java.util.stream.Collectors.toList()));
        }

        // fire_map에서 "Safe" 제외
        if (data.getFire_map() != null) {
            filtered.setFire_map(data.getFire_map().stream()
                    .filter(map -> !"Safe".equalsIgnoreCase(map.getEvent_type()))
                    .collect(java.util.stream.Collectors.toList()));
        }

        // action_json에서 "Safe" 제외
        if (data.getAction_json() != null) {
            filtered.setAction_json(data.getAction_json().stream()
                    .filter(event -> !"Safe".equalsIgnoreCase(event.getEvent_type()))
                    .collect(java.util.stream.Collectors.toList()));
        }

        // action_map에서 "Safe" 제외
        if (data.getAction_map() != null) {
            filtered.setAction_map(data.getAction_map().stream()
                    .filter(map -> !"Safe".equalsIgnoreCase(map.getEvent_type()))
                    .collect(java.util.stream.Collectors.toList()));
        }

        return filtered;
    }
}


/*
// ========== 원본 코드 (EventLogService 연결 전) ==========
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

*/
