package org.smartect.repository;

import org.smartect.entity.BoardEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BoardRepository extends JpaRepository<BoardEntity,Long> {
    // JPA에서 제공하는 메소드 사용
    List<BoardEntity> findAllByOrderByCreatedAtDesc();
    long count();

}
