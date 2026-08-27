package com.linguo.repository;

import com.linguo.model.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findAllByRoomIdOrderByCreatedAtAsc(UUID roomId);
    Optional<Message> findByIdAndRoomId(UUID id, UUID roomId);
}
