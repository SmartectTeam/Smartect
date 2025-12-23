package org.smartect.controller;

import org.smartect.dto.EventLogDTO;
import org.smartect.dto.EventLogRequest;
import org.smartect.entity.EventLogEntity;
import org.smartect.repository.EventLogRepository;
import org.smartect.service.EventLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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