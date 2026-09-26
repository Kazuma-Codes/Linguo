package com.mosaic.repository;

import com.mosaic.model.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, UUID> {

    @Query("SELECT r FROM ChatRoom r JOIN r.participants p WHERE p.user.id = :userId ORDER BY r.createdAt DESC")
    List<ChatRoom> findAllByParticipantUserId(@Param("userId") UUID userId);

    @Query("SELECT r FROM ChatRoom r WHERE r.roomType = 'direct' AND r.id IN " +
           "(SELECT p1.room.id FROM ChatParticipant p1 WHERE p1.user.id = :user1Id AND p1.room.id IN " +
           "(SELECT p2.room.id FROM ChatParticipant p2 WHERE p2.user.id = :user2Id))")
    Optional<ChatRoom> findDirectRoomBetweenUsers(@Param("user1Id") UUID user1Id, @Param("user2Id") UUID user2Id);

    List<ChatRoom> findAllByRoomTypeAndIsPrivateFalseOrderByCreatedAtDesc(String roomType);
}
