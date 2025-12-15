package org.smartect.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.smartect.common.enums.CamStatus;
import org.smartect.entity.CamEntity;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor

public class CamDTO {
    private Long camNo;
    private String location;
    private String name;
    private CamStatus status; // enum{ONLINE,OFFLINE}
    private LocalDateTime createdAt;
    private String detectBoxes; // 접근금지영역 좌표 (json)
//    private LocalDateTime updatedAt; 기록 안함~
    // 접근 금지 영역 좌표 변경시 업데이트 타임 기록할거삼?

}
