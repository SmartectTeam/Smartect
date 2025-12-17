package org.smartect.dto;
import lombok.*;
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

    // EventLog 조회를 위한 생성자
    public CamDTO(Long camNo, String name, String location) {
        this.camNo = camNo;
        this.name = name;
        this.location = location;
    }

}
