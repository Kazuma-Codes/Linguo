package com.linguo.service;

import com.linguo.model.dto.RoomCreateRequest;
import com.linguo.model.dto.RoomDetailResponse;
import com.linguo.model.dto.RoomResponse;
import com.linguo.model.entity.ChatParticipant;
import com.linguo.model.entity.ChatRoom;
import com.linguo.model.entity.User;
import com.linguo.repository.ChatParticipantRepository;
import com.linguo.repository.ChatRoomRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RoomService {

    private final ChatRoomRepository roomRepository;
    private final ChatParticipantRepository participantRepository;
    private final TranslationService translationService;

    public RoomService(ChatRoomRepository roomRepository, ChatParticipantRepository participantRepository, TranslationService translationService) {
        this.roomRepository = roomRepository;
        this.participantRepository = participantRepository;
        this.translationService = translationService;
    }

    private String norm(String lang) {
        return translationService.normLang(lang);
    }

    private String assignSeat(ChatRoom room, User user, boolean isCreator) {
        String src = norm(room.getSourceLang());
        String tgt = norm(room.getTargetLang());
        Set<String> pair = Set.of(src != null ? src : "en", tgt != null ? tgt : "es");
        String pref = norm(user.getPreferredLanguage());

        if (isCreator) {
            return (pref != null && pair.contains(pref)) ? pref : (src != null ? src : "en");
        }

        ChatParticipant creatorPart = participantRepository
                .findByRoomIdAndUserId(room.getId(), room.getCreator().getId())
                .orElse(null);

        String creatorSeat = creatorPart != null ? norm(creatorPart.getLanguage()) : null;

        if (pref != null && pair.contains(pref) && !pref.equals(creatorSeat)) {
            return pref;
        }
        if (creatorSeat != null && pair.contains(creatorSeat)) {
            return creatorSeat.equals(src) ? tgt : src;
        }
        return tgt != null ? tgt : "es";
    }

    @Transactional
    public RoomResponse createRoom(RoomCreateRequest request, User currentUser) {
        ChatRoom room = ChatRoom.builder()
                .title(request.getTitle())
                .sourceLang(request.getSourceLang() != null ? request.getSourceLang() : "en")
                .targetLang(request.getTargetLang())
                .creator(currentUser)
                .build();

        room = roomRepository.save(room);

        String seat = assignSeat(room, currentUser, true);
        ChatParticipant participant = ChatParticipant.builder()
                .room(room)
                .user(currentUser)
                .language(seat)
                .build();

        participantRepository.save(participant);

        return RoomResponse.builder()
                .id(room.getId())
                .title(room.getTitle())
                .sourceLang(room.getSourceLang())
                .targetLang(room.getTargetLang())
                .build();
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> listRooms(User currentUser) {
        return roomRepository.findAllByParticipantUserId(currentUser.getId()).stream()
                .map(room -> RoomResponse.builder()
                        .id(room.getId())
                        .title(room.getTitle())
                        .sourceLang(room.getSourceLang())
                        .targetLang(room.getTargetLang())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, String> joinRoom(UUID roomId, User currentUser) {
        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        if (participantRepository.existsByRoomIdAndUserId(roomId, currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Already a participant in this room");
        }

        String seat = assignSeat(room, currentUser, false);
        ChatParticipant participant = ChatParticipant.builder()
                .room(room)
                .user(currentUser)
                .language(seat)
                .build();

        participantRepository.save(participant);

        return Map.of("status", "joined", "room_id", roomId.toString());
    }

    @Transactional
    public RoomDetailResponse getRoom(UUID roomId, User currentUser) {
        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        ChatParticipant participant = participantRepository.findByRoomIdAndUserId(roomId, currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a participant of this room"));

        if (participant.getLanguage() == null) {
            boolean isCreator = currentUser.getId().equals(room.getCreator().getId());
            participant.setLanguage(assignSeat(room, currentUser, isCreator));
            participantRepository.save(participant);
        }

        return RoomDetailResponse.detailBuilder()
                .id(room.getId())
                .title(room.getTitle())
                .sourceLang(room.getSourceLang())
                .targetLang(room.getTargetLang())
                .creatorId(room.getCreator().getId())
                .myLanguage(norm(participant.getLanguage()))
                .build();
    }

    @Transactional
    public RoomDetailResponse setMyLanguage(UUID roomId, String newLanguage, User currentUser) {
        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        String normNew = norm(newLanguage);
        Set<String> pair = Set.of(norm(room.getSourceLang()), norm(room.getTargetLang()));
        if (!pair.contains(normNew)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Language not part of this room");
        }

        ChatParticipant participant = participantRepository.findByRoomIdAndUserId(roomId, currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a participant of this room"));

        participant.setLanguage(normNew);
        participantRepository.save(participant);

        return RoomDetailResponse.detailBuilder()
                .id(room.getId())
                .title(room.getTitle())
                .sourceLang(room.getSourceLang())
                .targetLang(room.getTargetLang())
                .creatorId(room.getCreator().getId())
                .myLanguage(normNew)
                .build();
    }
}
