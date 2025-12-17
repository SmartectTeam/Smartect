package org.smartect.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.smartect.dto.BoardDTO;
import org.smartect.dto.BoardRequest;
import org.smartect.entity.BoardEntity;
import org.smartect.repository.BoardRepository;
import org.springframework.stereotype.Service;

import static org.smartect.common.formatter.DateTimeFormatters.DEFAULT;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardRepository boardRepository;

    @Transactional
    public BoardDTO create(BoardRequest request,String ip) {
        // writerInfo : 게시물 작성자 ip 정보 마스킹? @@
        String writerInfo = ip;
        BoardEntity entity = BoardEntity
                .create( // Entity PROTECTED 유지를 위해 Entity에서 생성메서드 만들어둠
                        request.getTitle(),
                        request.getContent(),
                        writerInfo);

        BoardEntity saved = boardRepository.save(entity); // DB 저장
        return new BoardDTO(
                saved.getBoardNo(),
                saved.getWriterInfo(),
                saved.getTitle(),
                saved.getContent(),
                saved.getCreatedAt().format(DEFAULT)
        ); // 화면에 표시할 객체 전달
    }

    public List<BoardDTO> findAll() {
        // JPARepository 상속 -> JPQL 사용 (Entity) 최근순(생성일자 내림차순 정렬)
        List<BoardEntity> entityList = boardRepository.findAllByOrderByCreatedAtDesc();
        // Entity -> DTO 변환
        List<BoardDTO> dtoList = new ArrayList<>();
        for(BoardEntity entity : entityList){
            BoardDTO dto = new BoardDTO(
                    entity.getBoardNo(),
                    entity.getWriterInfo(), // 생성자 입력 순서 주의
                    entity.getTitle(),
                    entity.getContent(),
                    entity.getCreatedAt().format(DEFAULT)
            );
            dtoList.add(dto);
        }
        return dtoList;
    }
}
