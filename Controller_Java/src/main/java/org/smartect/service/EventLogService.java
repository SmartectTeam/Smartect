package org.smartect.service;

import lombok.RequiredArgsConstructor;
import org.smartect.dto.CamDTO;
import org.smartect.dto.EventLogDTO;
import org.smartect.entity.EventLogEntity;
import org.smartect.repository.EventLogRepository;
import org.springframework.stereotype.Service;
import static org.smartect.common.formatter.DateTimeFormatters.DEFAULT;
import java.util.ArrayList;
import java.util.List;

@Service
public class EventLogService {

    private final EventLogRepository eventLogRepository;

    public EventLogService(EventLogRepository eventLogRepository) {
        this.eventLogRepository = eventLogRepository;
    }

    // 로그 목록 조회
    public List<EventLogDTO> findAll() {
        List<EventLogEntity> entityList = eventLogRepository.findAllByOrderByCreatedAtDesc();
        List<EventLogDTO> dtoList = new ArrayList<>();
        for(EventLogEntity entity : entityList){
            // NULL 확인 notNull -> 포멧 변경, Null -> Null
            // NullPointException 방지
            String checkedAt =
                    entity.getCheckedAt()!=null?
                            entity.getCheckedAt().format(DEFAULT)
                            :null;

            // CamEntity -> CamDTO 변환
            CamDTO camDTO = new CamDTO(
                    entity.getCamEntity().getCamNo(),
                    entity.getCamEntity().getName(),
                    entity.getCamEntity().getLocation()
            );

            // EventLogEntity -> EventLogDTO 변환
            EventLogDTO dto = new EventLogDTO(
                    entity.getEventNo(),
                    camDTO,
                    entity.getEventType(),
                    entity.getScreenshotPath(),
                    entity.getMemo(),
                    entity.getCreatedAt().format(DEFAULT),
                    // Null 허용
                    checkedAt
            );
            dtoList.add(dto);
        }
        // 이벤트 로그 DTO 리스트 반환
        return dtoList;
    }
}
