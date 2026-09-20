package com.mosaic.repository;

import com.mosaic.model.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findAllByRoomIdOrderByCreatedAtAsc(UUID roomId);
    Optional<Message> findByIdAndRoomId(UUID id, UUID roomId);

    @Query("SELECT m.status FROM Message m WHERE m.id = :id")
    Optional<String> findStatusById(@Param("id") UUID id);

    /**
     * Atomic draft-only write: returns 0 when the message was already confirmed
     * (status = 'final'), in which case the AI result must be discarded instead
     * of overwriting the user's edited translation.
     */
    @Modifying
    @Query("UPDATE Message m SET m.translatedText = :translated, m.detectedLang = :detectedLang, m.translations = :translations "
            + "WHERE m.id = :id AND m.status <> 'final'")
    int applyTranslationIfDraft(@Param("id") UUID id,
                                @Param("translated") String translated,
                                @Param("detectedLang") String detectedLang,
                                @Param("translations") String translations);

    @Modifying
    @Query("UPDATE Message m SET m.culturalFootnotes = :footnotes WHERE m.id = :id AND m.status <> 'final'")
    int applyFootnotesIfDraft(@Param("id") UUID id, @Param("footnotes") String footnotes);
}
