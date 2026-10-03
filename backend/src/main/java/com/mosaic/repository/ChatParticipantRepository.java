package com.mosaic.repository;

import com.mosaic.model.entity.ChatParticipant;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatParticipantRepository extends JpaRepository<ChatParticipant, UUID> {
    Optional<ChatParticipant> findByRoomIdAndUserId(UUID roomId, UUID userId);

    @EntityGraph(attributePaths = {"user"})
    Optional<ChatParticipant> findFirstByRoomIdAndUserIdNot(UUID roomId, UUID userId);

    @EntityGraph(attributePaths = {"user"})
    List<ChatParticipant> findAllByRoomId(UUID roomId);

    @Modifying
    @Query("UPDATE ChatParticipant p SET p.language = :lang WHERE p.user.id = :userId")
    int updateLanguageByUserId(@Param("userId") UUID userId, @Param("lang") String lang);

    boolean existsByRoomIdAndUserId(UUID roomId, UUID userId);

    long countByRoomId(UUID roomId);
}
