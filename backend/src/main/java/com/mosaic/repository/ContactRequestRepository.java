package com.mosaic.repository;

import com.mosaic.model.entity.ContactRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContactRequestRepository extends JpaRepository<ContactRequest, UUID> {
    List<ContactRequest> findAllByToUserIdAndStatusOrderByCreatedAtDesc(UUID toUserId, String status);
    Optional<ContactRequest> findByFromUserIdAndToUserId(UUID fromUserId, UUID toUserId);
}
