package com.mosaic.repository;

import com.mosaic.model.entity.Contact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContactRepository extends JpaRepository<Contact, UUID> {
    List<Contact> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<Contact> findByUserIdAndContactUserId(UUID userId, UUID contactUserId);
    boolean existsByUserIdAndContactUserId(UUID userId, UUID contactUserId);
    void deleteByUserIdAndContactUserId(UUID userId, UUID contactUserId);
}
