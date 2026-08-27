package com.linguo.repository;

import com.linguo.model.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, UUID> {

    @Query("SELECT r FROM ChatRoom r JOIN r.participants p WHERE p.user.id = :userId")
    List<ChatRoom> findAllByParticipantUserId(@Param("userId") UUID userId);
}
