//package org.smartect.controller;
//
//import lombok.RequiredArgsConstructor;
//import org.smartect.dto.CombinedJsonDTO;
//import org.smartect.dto.EventJsonDTO;
//import org.smartect.service.EventLogService;
//import org.smartect.service.EventJsonService;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.PostMapping;
//import org.springframework.web.bind.annotation.RequestBody;
//import org.springframework.web.bind.annotation.RequestMapping;
//import org.springframework.web.bind.annotation.RestController;
//
//@RestController
//@RequestMapping("/api/detection-log")
//@RequiredArgsConstructor
//public class DetectionLogController {
//
//    private final EventJsonService logService;
//    private final EventLogService eventLogService;
//
//    @PostMapping("/save")
//    public ResponseEntity<String> saveDetectionLog(@RequestBody CombinedJsonDTO data) {
//        try {
//            // "Safe" 이벤트 필터링된 데이터 생성 (파일 로그용)
//            CombinedJsonDTO filteredData = filterSafeEvents(data);
//
//            // 파일 로그 저장
//            logService.saveDailyDetectionLog(filteredData);
//
//            // DB 로그 저장 (fire_json이 있을 때만, "Safe" 제외)
//            if (data.getFire_json() != null && !data.getFire_json().isEmpty()) {
//                for (EventJsonDTO eventJson : data.getFire_json()) {
//                    // "Safe" 이벤트는 저장하지 않음
//                    if ("Safe".equalsIgnoreCase(eventJson.getEvent_type())) {
//                        continue;
//                    }
//                    try {
//                        eventLogService.saveDetectionLog(
//                                eventJson.getCam_no(),
//                                eventJson.getEvent_type(),
//                                eventJson.getScreenshot_path() != null ? eventJson.getScreenshot_path() : ""
//                        );
//                    } catch (Exception e) {
//                        System.err.println("DB 로그 저장 실패 (cam_no: " + eventJson.getCam_no() +
//                                ", event_type: " + eventJson.getEvent_type() + "): " + e.getMessage());
//                    }
//                }
//            }
//
//            // action_json 저장 (필요한 경우, "Safe" 제외)
//            if (data.getAction_json() != null && !data.getAction_json().isEmpty()) {
//                for (EventJsonDTO eventJson : data.getAction_json()) {
//                    // "Safe" 이벤트는 저장하지 않음
//                    if ("Safe".equalsIgnoreCase(eventJson.getEvent_type())) {
//                        continue;
//                    }
//                    try {
//                        eventLogService.saveDetectionLog(
//                                eventJson.getCam_no(),
//                                eventJson.getEvent_type(),
//                                eventJson.getScreenshot_path() != null ? eventJson.getScreenshot_path() : ""
//                        );
//                    } catch (Exception e) {
//                        System.err.println("DB 로그 저장 실패 (cam_no: " + eventJson.getCam_no() +
//                                ", event_type: " + eventJson.getEvent_type() + "): " + e.getMessage());
//                    }
//                }
//            }
//
//            return ResponseEntity.ok("로그 저장 완료");
//        } catch (Exception e) {
//            return ResponseEntity.internalServerError().body("로그 저장 실패: " + e.getMessage());
//        }
//    }
//
//    /**
//     * "Safe" 이벤트를 필터링한 CombinedJsonDTO 생성
//     */
//    private CombinedJsonDTO filterSafeEvents(CombinedJsonDTO data) {
//        CombinedJsonDTO filtered = new CombinedJsonDTO();
//        filtered.setType(data.getType());
//        filtered.setCam_no(data.getCam_no());
//        filtered.setImg_bytes(data.getImg_bytes());
//
//        // fire_json에서 "Safe" 제외
//        if (data.getFire_json() != null) {
//            filtered.setFire_json(data.getFire_json().stream()
//                    .filter(event -> !"Safe".equalsIgnoreCase(event.getEvent_type()))
//                    .collect(java.util.stream.Collectors.toList()));
//        }
//
//        // fire_map에서 "Safe" 제외
//        if (data.getFire_map() != null) {
//            filtered.setFire_map(data.getFire_map().stream()
//                    .filter(map -> !"Safe".equalsIgnoreCase(map.getEvent_type()))
//                    .collect(java.util.stream.Collectors.toList()));
//        }
//
//        // action_json에서 "Safe" 제외
//        if (data.getAction_json() != null) {
//            filtered.setAction_json(data.getAction_json().stream()
//                    .filter(event -> !"Safe".equalsIgnoreCase(event.getEvent_type()))
//                    .collect(java.util.stream.Collectors.toList()));
//        }
//
//        // action_map에서 "Safe" 제외
//        if (data.getAction_map() != null) {
//            filtered.setAction_map(data.getAction_map().stream()
//                    .filter(map -> !"Safe".equalsIgnoreCase(map.getEvent_type()))
//                    .collect(java.util.stream.Collectors.toList()));
//        }
//
//        return filtered;
//    }
//}