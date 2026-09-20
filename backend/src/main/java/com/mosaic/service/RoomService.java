package com.mosaic.service;

import com.mosaic.model.dto.MemberResponse;
import com.mosaic.model.dto.RoomCreateRequest;
import com.mosaic.model.dto.RoomDetailResponse;
import com.mosaic.model.dto.RoomResponse;
import com.mosaic.model.entity.ChatParticipant;
import com.mosaic.model.entity.ChatRoom;
import com.mosaic.model.entity.User;
import com.mosaic.repository.ChatParticipantRepository;
import com.mosaic.repository.ChatRoomRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
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
        String pref = norm(user.getPreferredLanguage());
        if (pref != null && TranslationService.LANG_MAP.containsKey(pref)) {
            return pref;
        }
        String src = norm(room.getSourceLang());
        return src != null ? src : "en";
    }

    @Transactional
    public RoomResponse createRoom(RoomCreateRequest request, User currentUser) {
        String defaultSrc = currentUser.getPreferredLanguage() != null ? currentUser.getPreferredLanguage() : "en";
        // Target lang column is maintained for backward-compatibility only
        String defaultTgt = "en".equals(defaultSrc) ? "es" : "en";

        ChatRoom room = ChatRoom.builder()
                .title(request.getTitle() != null && !request.getTitle().isBlank() ? request.getTitle().trim() : "New Room")
                .sourceLang(request.getSourceLang() != null && !request.getSourceLang().isBlank() ? request.getSourceLang() : defaultSrc)
                .targetLang(defaultTgt)
                .maxMembers(50)
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
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User is already a member of this room");
        }

        int maxMembers = room.getMaxMembers() != null ? room.getMaxMembers() : 50;
        if (participantRepository.countByRoomId(roomId) >= maxMembers) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Room is full (max " + maxMembers + " participants)");
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

        boolean isCreator = currentUser.getId().equals(room.getCreator().getId());

        ChatParticipant participant = participantRepository.findByRoomIdAndUserId(roomId, currentUser.getId())
                .orElseGet(() -> {
                    String seat = assignSeat(room, currentUser, isCreator);
                    ChatParticipant newPart = ChatParticipant.builder()
                            .room(room)
                            .user(currentUser)
                            .language(seat)
                            .build();
                    return participantRepository.save(newPart);
                });

        if (participant.getLanguage() == null) {
            participant.setLanguage(assignSeat(room, currentUser, isCreator));
            participant = participantRepository.save(participant);
        }

        List<ChatParticipant> allParticipants = participantRepository.findAllByRoomId(roomId);
        List<MemberResponse> members = allParticipants.stream()
                .map(p -> MemberResponse.builder()
                        .email(p.getUser().getEmail())
                        .language(norm(p.getLanguage()))
                        .joinedAt(p.getJoinedAt())
                        .build())
                .collect(Collectors.toList());

        List<String> distinctLangs = allParticipants.stream()
                .map(p -> norm(p.getLanguage()))
                .filter(lang -> lang != null && TranslationService.LANG_MAP.containsKey(lang))
                .distinct()
                .collect(Collectors.toList());

        return RoomDetailResponse.detailBuilder()
                .id(room.getId())
                .title(room.getTitle())
                .sourceLang(room.getSourceLang())
                .targetLang(room.getTargetLang())
                .creatorId(room.getCreator().getId())
                .myLanguage(norm(participant.getLanguage()))
                .members(members)
                .distinctLangs(distinctLangs)
                .build();
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> getRoomMembers(UUID roomId, User currentUser) {
        if (!roomRepository.existsById(roomId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found");
        }

        if (!participantRepository.existsByRoomIdAndUserId(roomId, currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a participant of this room");
        }

        return participantRepository.findAllByRoomId(roomId).stream()
                .map(p -> MemberResponse.builder()
                        .email(p.getUser().getEmail())
                        .language(norm(p.getLanguage()))
                        .joinedAt(p.getJoinedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public RoomDetailResponse setMyLanguage(UUID roomId, String newLanguage, User currentUser) {
        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        String normNew = norm(newLanguage);
        if (normNew == null || !TranslationService.LANG_MAP.containsKey(normNew)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported language code: " + newLanguage);
        }

        ChatParticipant participant = participantRepository.findByRoomIdAndUserId(roomId, currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a participant of this room"));

        participant.setLanguage(normNew);
        participantRepository.save(participant);

        List<ChatParticipant> allParticipants = participantRepository.findAllByRoomId(roomId);
        List<MemberResponse> members = allParticipants.stream()
                .map(p -> MemberResponse.builder()
                        .email(p.getUser().getEmail())
                        .language(norm(p.getLanguage()))
                        .joinedAt(p.getJoinedAt())
                        .build())
                .collect(Collectors.toList());

        List<String> distinctLangs = allParticipants.stream()
                .map(p -> norm(p.getLanguage()))
                .filter(lang -> lang != null && TranslationService.LANG_MAP.containsKey(lang))
                .distinct()
                .collect(Collectors.toList());

        return RoomDetailResponse.detailBuilder()
                .id(room.getId())
                .title(room.getTitle())
                .sourceLang(room.getSourceLang())
                .targetLang(room.getTargetLang())
                .creatorId(room.getCreator().getId())
                .myLanguage(normNew)
                .members(members)
                .distinctLangs(distinctLangs)
                .build();
    }
}
