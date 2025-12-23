//package org.smartect.controller;
//
//import lombok.RequiredArgsConstructor;
//import org.smartect.service.CaptureService;
//import org.smartect.service.EventLogService;
//import org.springframework.core.io.FileSystemResource;
//import org.springframework.core.io.Resource;
//import org.springframework.http.HttpHeaders;
//import org.springframework.http.MediaType;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import java.io.File;
//import java.nio.file.Files;
//import java.nio.file.Path;
//import java.nio.file.Paths;
//import java.util.Base64;
//import java.util.Map;
//
//@RestController
//@RequestMapping("/api/capture")
//@RequiredArgsConstructor
//public class CaptureController {
//
//    private final CaptureService captureService;
//    private final EventLogService eventLogService;
//
//    @PostMapping("/save")
//    public ResponseEntity<Map<String, String>> saveCapture(@RequestBody Map<String, Object> request) {
//        try {
//            String imageBase64 = (String) request.get("image");
//            Integer camNo = Integer.valueOf(request.get("camNo").toString());
//            String eventType = (String) request.get("eventType");
//
//            // Base64 디코딩
//            byte[] imageBytes = Base64.getDecoder().decode(imageBase64.split(",")[1]);
//
//            // 캡쳐 저장 (공유 폴더 경로)
//            String savedPath = captureService.saveAlertCapture(imageBytes, camNo, eventType);
//
//            if (savedPath != null) {
//                // 알람 캡쳐 경로를 DB에 업데이트 (파이썬에서 넘어온 경로와 구분)
//                eventLogService.updateAlertCapturePath(camNo, eventType, savedPath);
//
//                return ResponseEntity.ok(Map.of(
//                        "success", "true",
//                        "path", savedPath
//                ));
//            } else {
//                return ResponseEntity.internalServerError().body(Map.of(
//                        "success", "false",
//                        "error", "캡쳐 저장 실패"
//                ));
//            }
//        } catch (Exception e) {
//            return ResponseEntity.internalServerError().body(Map.of(
//                    "success", "false",
//                    "error", e.getMessage()
//            ));
//        }
//    }
//
//    /**
//     * 공유 폴더의 캡쳐 이미지를 웹에서 접근할 수 있도록 제공
//     * 경로 예: /api/capture/image?path=\\220-29\공유폴더\captures\2024-01-15\CCTV-01_fire_2024-01-15_143022.jpg
//     */
//    @GetMapping("/image")
//    public ResponseEntity<Resource> getCaptureImage(@RequestParam String path) {
//        try {
//            // 경로가 공유 폴더 경로인 경우
//            File imageFile = new File(path);
//
//            if (!imageFile.exists()) {
//                // 공유 폴더 접근 실패 시 로컬 경로로 시도
//                Path localPath = Paths.get("captures").resolve(Paths.get(path).getFileName());
//                imageFile = localPath.toFile();
//            }
//
//            if (!imageFile.exists() || !imageFile.isFile()) {
//                return ResponseEntity.notFound().build();
//            }
//
//            Resource resource = new FileSystemResource(imageFile);
//            String contentType = Files.probeContentType(imageFile.toPath());
//            if (contentType == null) {
//                contentType = "image/jpeg"; // 기본값
//            }
//
//            return ResponseEntity.ok()
//                    .contentType(MediaType.parseMediaType(contentType))
//                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + imageFile.getName() + "\"")
//                    .body(resource);
//        } catch (Exception e) {
//            return ResponseEntity.internalServerError().build();
//        }
//    }
//}