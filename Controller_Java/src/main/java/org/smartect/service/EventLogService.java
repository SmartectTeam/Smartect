package org.smartect.service;

import jakarta.transaction.Transactional;
import org.smartect.dto.CamDTO;
import org.smartect.dto.EventLogDTO;
import org.smartect.entity.EventLogEntity;
import org.smartect.entity.CamEntity;
import org.smartect.repository.EventLogRepository;
import org.smartect.repository.CamRepository;
import org.springframework.stereotype.Service;
import static org.smartect.common.formatter.DateTimeFormatters.DEFAULT;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class EventLogService {

    private final EventLogRepository eventLogRepository;
    private final CamRepository camRepository;

    public EventLogService(EventLogRepository eventLogRepository, CamRepository camRepository) {
        this.eventLogRepository = eventLogRepository;
        this.camRepository = camRepository;
    }

    // 로그 목록 조회 (Select *)
    public List<EventLogDTO> findAll() {
        List<EventLogEntity> entityList = eventLogRepository.findAllByOrderByCreatedAtDesc();
        List<EventLogDTO> dtoList = new ArrayList<>();
        for (EventLogEntity entity : entityList) {
            // NULL 확인 notNull -> 포멧 변경, Null -> Null
            // NullPointException 방지
            String checkedAt =
                    entity.getCheckedAt() != null ?
                            entity.getCheckedAt().format(DEFAULT)
                            : null;

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


    // JPA 영속성 컨텍스트 + 더티체킹
    // findById() 호출시에 Entity가 persistent(영속상태)가 된다.
    // entity -> updateCheckedAt(),updateMemo()
    // 불러온 객체 값을 변경하면 트랜젝션 종료 시점에 DB 업데이트

    // 이벤트 확인 : CheckedAt 갱신 (Update)
    @Transactional
    public void checkEvent(Long eventNo) {
        EventLogEntity entity = eventLogRepository.findById(eventNo)
                .orElseThrow(() -> new IllegalArgumentException("이벤트가 존재하지 않습니다. eventNo : " + eventNo));
        // 이미 확인된 로그는 다시 처리하지 않음
        if (entity.getCheckedAt() != null) {
            return;
        }
        entity.updateCheckedAt(LocalDateTime.now());
    }

    // 메모 수정(작성) (Update)
    @Transactional
    public void updateMemo(Long eventNo, String memo) {
        EventLogEntity entity = eventLogRepository.findById(eventNo)
                .orElseThrow(() -> new IllegalArgumentException("이벤트가 존재하지 않습니다. eventNo : " + eventNo));
        entity.updateMemo(memo);
    }

    // 감지 로그 저장 (Insert)
    @Transactional
    public EventLogEntity saveDetectionLog(int camNo, String eventType, String screenshotPath) {
        // cam_no로 CamEntity 조회 (FK)
        CamEntity camEntity = camRepository.findById((long) camNo)
                .orElseThrow(() -> new IllegalArgumentException("카메라가 존재하지 않습니다. cam_no : " + camNo));

        // EventLogEntity 생성 (memo, checkedAt 은 null, createdAt 은 자동)
        EventLogEntity entity = EventLogEntity.create(camEntity, eventType, screenshotPath);

        // DB 저장
        return eventLogRepository.save(entity);
    }
}

