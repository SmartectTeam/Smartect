package org.smartect.controller;

import org.smartect.dto.EventLogDTO;
import org.smartect.dto.EventLogRequest;
import org.smartect.entity.EventLogEntity;
import org.smartect.repository.EventLogRepository;
import org.smartect.service.EventLogService;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class EventLogApiController {
    private final EventLogService eventLogService;

    public EventLogApiController(EventLogService eventLogService) {
        this.eventLogService = eventLogService;
    }

    // event board  - 비동기 이벤트로그 목록 조회
    @GetMapping("/events")
    public List<EventLogDTO> getEvents(){
        return eventLogService.findAll();
    }

    // event board - 이벤트 상세보기 - id별 요청에 따른 이미지 반환
    @GetMapping("/events/image/{eventNo}")
    public ResponseEntity<Resource> loadEventImage(@PathVariable Long eventNo){
        EventLogEntity event = eventLogService.findById(eventNo);
        try {
            // 저장된 스크린샷이 없을 경우
            if (event.getScreenshotPath() == null || event.getScreenshotPath().isBlank()) {
                Resource noImage = new ClassPathResource("static/images/no_image.png");
                return ResponseEntity.ok()
                        .contentType(MediaType.IMAGE_PNG)
                        .body(noImage);
            }

            // DB 경로를 이용해 실제 공유폴더에 있는 스크린샷 읽기
            Path imagePath = Paths.get(event.getScreenshotPath());
            Resource resource = new FileSystemResource(imagePath);

            if (!resource.exists() || !resource.isReadable()) {
                throw new IOException("이미지 파일 접근 불가");
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(resource);

        } catch (Exception e) {
            // 스크린샷 읽어오기 오류 -> 오류 이미지 반환
            Resource errorImage = new ClassPathResource("static/images/error_image.png");
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(errorImage);
        }
    }

    // event board - detail memo Update
    @PatchMapping("/events/{eventNo}/memo")
    public ResponseEntity<Void> updateMemo(@PathVariable Long eventNo,@RequestBody EventLogRequest request){
        eventLogService.updateMemo(eventNo,request.getMemo());
        return ResponseEntity.ok().build();
    }

    // event board - detail checked 확인안됨 -> 확인됨으로만 변경 가능, 되돌릴 수 없음!
    @PatchMapping("/events/{eventNo}/check")
    public ResponseEntity<Void> updateCheck(@PathVariable Long eventNo){
        eventLogService.checkEvent(eventNo);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/events/count/uncheck")
    public Map<String,Long> getUncheckedCount(){
        return Map.of("count", eventLogService.getUnCheckedCount());
    }

}