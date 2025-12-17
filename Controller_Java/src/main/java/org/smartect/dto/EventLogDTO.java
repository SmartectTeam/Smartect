package org.smartect.dto;

import lombok.*;
import org.smartect.entity.CamEntity;

import java.time.LocalDateTime;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class EventLogDTO {
    // 예시 json 기반으로 작성, 변경 가능성 있음
//    {
//         "cam_no": 2,
//         "event_type": "fire",
//         "danger_level": Null,
//         "event_time": "2025-01-01T12:00:00",
//         "screenshot_path": "/images/capture_123.png"
//    }
    private Long eventNo; // 위험도 높은 이벤트만 걸러서 들어옴, 전부 DB
    private CamDTO camDTO;
    private String eventType;
    private String screenshotPath; // Python에서 저장, 경로만 넘어옴
    private String memo;

    // LocalDateTime -> String Service에서 날짜 포멧 타입 변경 후 전달
    private String createdAt;
    // Null == UnChecked Not Null == Checked
    private String checkedAt;

//    fire Class
//
//    motion Class 종류
//    safe
//      - sitting
//      - standing
//
//    activity
//      - rotating
//      - walking
//
//    threat ( 사실상 이 class 들만 위험함 )
//      - punching
//      - pushing
//      - reaching
//    etc


}
