package com.mosaic.repository;

import com.mosaic.model.entity.ChatParticipant;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatParticipantRepository extends JpaRepository<ChatParticipant, UUID> {
    Optional<ChatParticipant> findByRoomIdAndUserId(UUID roomId, UUID userId);

    @EntityGraph(attributePaths = {"user"})
    List<ChatParticipant> findAllByRoomId(UUID roomId);

    boolean existsByRoomIdAndUserId(UUID roomId, UUID userId);

    long countByRoomId(UUID roomId);
}
