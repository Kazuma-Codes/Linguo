package com.mosaic.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mosaic.model.dto.MemberResponse;
import com.mosaic.model.dto.MessageResponse;
import com.mosaic.model.dto.RoomCreateRequest;
import com.mosaic.model.dto.RoomDetailResponse;
import com.mosaic.model.dto.RoomResponse;
import com.mosaic.model.dto.RoomUpdateRequest;
import com.mosaic.model.entity.ChatParticipant;
import com.mosaic.model.entity.ChatRoom;
import com.mosaic.model.entity.Message;
import com.mosaic.model.entity.User;
import com.mosaic.repository.ChatParticipantRepository;
import com.mosaic.repository.ChatRoomRepository;
import com.mosaic.repository.MessageRepository;
import com.mosaic.repository.UserRepository;
import org.springframework.boot.rsocket.server.RSocketServerException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RoomService {

    private final ChatRoomRepository roomRepository;
    private final ChatParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final TranslationService translationService;
    private final ObjectMapper objectMapper;

    public RoomService(ChatRoomRepository roomRepository,
                       ChatParticipantRepository participantRepository,
                       MessageRepository messageRepository,
                       UserRepository userRepository,
                       TranslationService translationService,
                       ObjectMapper objectMapper) {
        this.roomRepository = roomRepository;
        this.participantRepository = participantRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.translationService = translationService;
        this.objectMapper = objectMapper;
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
        String defaultTgt = "en".equals(defaultSrc) ? "es" : "en";

        ChatRoom room = ChatRoom.builder()
                .title(request.getTitle() != null && !request.getTitle().isBlank() ? request.getTitle().trim() : "New Room")
                .sourceLang(request.getSourceLang() != null && !request.getSourceLang().isBlank() ? request.getSourceLang() : defaultSrc)
                .targetLang(defaultTgt)
                .roomType(request.getRoomType() != null ? request.getRoomType() : "group")
                .description(request.getDescription())
                .emoji(request.getEmoji() != null ? request.getEmoji() : "💬")
                .avatarUrl(request.getAvatarUrl())
                .isPrivate(request.getIsPrivate() != null ? request.getIsPrivate() : false)
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

        return toRoomResponse(room, currentUser);
    }

    @Transactional
    public RoomResponse getOrCreateDirectRoom(UUID targetUserId, User currentUser) {
        if (targetUserId.equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot create direct chat with yourself");
        }

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target user not found"));

        Optional<ChatRoom> existingDirect = roomRepository.findDirectRoomBetweenUsers(currentUser.getId(), targetUserId);
        if (existingDirect.isPresent()) {
            return toRoomResponse(existingDirect.get(), currentUser);
        }

        String myLang = currentUser.getPreferredLanguage() != null ? currentUser.getPreferredLanguage() : "en";
        String theirLang = targetUser.getPreferredLanguage() != null ? targetUser.getPreferredLanguage() : "en";

        ChatRoom room = ChatRoom.builder()
                .title("Direct Chat")
                .sourceLang(myLang)
                .targetLang(theirLang)
                .roomType("direct")
                .emoji("💬")
                .isPrivate(true)
                .maxMembers(2)
                .creator(currentUser)
                .build();

        room = roomRepository.save(room);

        ChatParticipant p1 = ChatParticipant.builder()
                .room(room)
                .user(currentUser)
                .language(myLang)
                .build();
        ChatParticipant p2 = ChatParticipant.builder()
                .room(room)
                .user(targetUser)
                .language(theirLang)
                .build();

        participantRepository.save(p1);
        participantRepository.save(p2);

        return toRoomResponse(room, currentUser);
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> listRooms(User currentUser) {
        return roomRepository.findAllByParticipantUserId(currentUser.getId()).stream()
                .map(room -> toRoomResponse(room, currentUser))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> listDiscoverableRooms(User currentUser) {
        return roomRepository.findAllByRoomTypeAndIsPrivateFalseOrderByCreatedAtDesc("group").stream()
                .filter(room -> !participantRepository.existsByRoomIdAndUserId(room.getId(), currentUser.getId()))
                .map(room -> toRoomResponse(room, currentUser))
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, String> joinRoom(UUID roomId, User currentUser) {
        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        if ("direct".equalsIgnoreCase(room.getRoomType())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Direct chats cannot be joined");
        }

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

        // Private / direct rooms must never auto-join on read (IDOR guard).
        // Callers must use joinRoom (explicit user action) first.
        boolean isPrivate = Boolean.TRUE.equals(room.getIsPrivate());
        boolean isDirect = "direct".equalsIgnoreCase(room.getRoomType());
        boolean isMember = participantRepository.existsByRoomIdAndUserId(roomId, currentUser.getId());
        if (!isMember && (isPrivate || isDirect) && !isCreator) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a participant of this room");
        }

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
        } else {
            // Single source of truth: Settings preferred_language wins.
            // Auto-heal stale per-room seats left over from before the global-default change.
            String prefNorm = norm(currentUser.getPreferredLanguage());
            String seatNorm = norm(participant.getLanguage());
            if (prefNorm != null && TranslationService.LANG_MAP.containsKey(prefNorm)
                    && !prefNorm.equals(seatNorm)) {
                participant.setLanguage(prefNorm);
                participant = participantRepository.save(participant);
            }
        }

        List<ChatParticipant> allParticipants = participantRepository.findAllByRoomId(roomId);
        List<MemberResponse> members = allParticipants.stream()
                .map(p -> MemberResponse.builder()
                        .userId(p.getUser().getId())
                        .email(p.getUser().getEmail())
                        .username(p.getUser().getUsername() != null ? p.getUser().getUsername() : p.getUser().getEmail().split("@")[0])
                        .avatarUrl(p.getUser().getAvatarUrl())
                        .language(norm(p.getLanguage()))
                        .joinedAt(p.getJoinedAt())
                        .build())
                .collect(Collectors.toList());

        List<String> distinctLangs = allParticipants.stream()
                .map(p -> norm(p.getLanguage()))
                .filter(lang -> lang != null && TranslationService.LANG_MAP.containsKey(lang))
                .distinct()
                .collect(Collectors.toList());

        String displayTitle = room.getTitle();
        String displayAvatar = room.getAvatarUrl();
        if ("direct".equalsIgnoreCase(room.getRoomType())) {
            Optional<ChatParticipant> other = allParticipants.stream()
                    .filter(p -> !p.getUser().getId().equals(currentUser.getId()))
                    .findFirst();
            if (other.isPresent()) {
                User ou = other.get().getUser();
                displayTitle = ou.getUsername() != null ? ou.getUsername() : ou.getEmail().split("@")[0];
                displayAvatar = ou.getAvatarUrl();
            }
        }

        RoomDetailResponse r = new RoomDetailResponse();
        r.setId(room.getId());
        r.setTitle(displayTitle);
        r.setSourceLang(room.getSourceLang());
        r.setTargetLang(room.getTargetLang());
        r.setRoomType(room.getRoomType());
        r.setDescription(room.getDescription());
        r.setEmoji(room.getEmoji());
        r.setAvatarUrl(displayAvatar);
        r.setIsPrivate(room.getIsPrivate());
        r.setMembersCount(allParticipants.size());
        r.setCreatorId(room.getCreator().getId());
        r.setMyLanguage(norm(participant.getLanguage()));
        r.setMembers(members);
        r.setDistinctLangs(distinctLangs);
        return r;
    }

    @Transactional
    public List<MessageResponse> getRoomMessages(UUID roomId, User currentUser) {
        if (!roomRepository.existsById(roomId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found");
        }

        if (!participantRepository.existsByRoomIdAndUserId(roomId, currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a participant of this room");
        }

        // Mark incoming messages as read
        messageRepository.markRoomMessagesAsRead(roomId, currentUser.getId(), "read");

        List<Message> messages = messageRepository.findAllByRoomIdAndStatusOrderByCreatedAtAsc(roomId, "final");

        return messages.stream().map(m -> {
            Map<String, String> parsedTranslations = null;
            if (m.getTranslations() != null && !m.getTranslations().isBlank()) {
                try {
                    parsedTranslations = objectMapper.readValue(m.getTranslations(), new TypeReference<Map<String, String>>() {});
                } catch (Exception ignored) {}
            }

            Object parsedFootnotes = null;
            if (m.getCulturalFootnotes() != null && !m.getCulturalFootnotes().isBlank()) {
                try {
                    parsedFootnotes = objectMapper.readValue(m.getCulturalFootnotes(), new TypeReference<Map<String, Object>>() {});
                } catch (Exception ignored) {}
            }

            User sender = m.getSender();
            return MessageResponse.builder()
                    .id(m.getId())
                    .roomId(roomId)
                    .senderId(sender.getId())
                    .senderEmail(sender.getEmail())
                    .senderUsername(sender.getUsername() != null ? sender.getUsername() : sender.getEmail().split("@")[0])
                    .senderAvatarUrl(sender.getAvatarUrl())
                    .originalText(m.getOriginalText())
                    .translatedText(m.getTranslatedText())
                    .detectedLang(m.getDetectedLang())
                    .translations(parsedTranslations)
                    .culturalFootnotes(parsedFootnotes)
                    .messageType(m.getMessageType())
                    .replyToId(m.getReplyToId())
                    .attachmentUrl(m.getAttachmentUrl())
                    .attachmentName(m.getAttachmentName())
                    .attachmentSize(m.getAttachmentSize())
                    .deliveryStatus(m.getDeliveryStatus())
                    .status(m.getStatus())
                    .isMe(sender.getId().equals(currentUser.getId()))
                    .createdAt(m.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
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
                        .userId(p.getUser().getId())
                        .email(p.getUser().getEmail())
                        .username(p.getUser().getUsername() != null ? p.getUser().getUsername() : p.getUser().getEmail().split("@")[0])
                        .avatarUrl(p.getUser().getAvatarUrl())
                        .language(norm(p.getLanguage()))
                        .joinedAt(p.getJoinedAt())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Creator/admin-only group settings update (title, description, emoji).
     * Only the room creator may change these; everyone else gets 403.
     */
    @Transactional
    public RoomDetailResponse updateRoom(UUID roomId, RoomUpdateRequest request, User currentUser) {
        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        if (!room.getCreator().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the group creator can change settings");
        }

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            room.setTitle(request.getTitle().trim());
        }
        if (request.getDescription() != null) {
            room.setDescription(request.getDescription().trim());
        }
        if (request.getEmoji() != null && !request.getEmoji().isBlank()) {
            room.setEmoji(request.getEmoji().trim());
        }
        if (request.getAvatarUrl() != null) {
            room.setAvatarUrl(request.getAvatarUrl().trim());
        }
        roomRepository.save(room);

        return getRoom(roomId, currentUser);
    }

    @Transactional
    public RoomDetailResponse setMyLanguage(UUID roomId, String newLanguage, User currentUser) {        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        String normNew = norm(newLanguage);
        if (normNew == null || !TranslationService.LANG_MAP.containsKey(normNew)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported language code: " + newLanguage);
        }

        ChatParticipant participant = participantRepository.findByRoomIdAndUserId(roomId, currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a participant of this room"));

        participant.setLanguage(normNew);
        participantRepository.save(participant);

        return getRoom(roomId, currentUser);
    }

    @Transactional
    // ponytail: link-known = invited; add left-members/ban table if rejoin abuse matters
    public void leaveRoom(UUID roomId,User currentUser){
        ChatRoom room = roomRepository.findById(roomId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND,"room not found"));

        ChatParticipant participant = participantRepository.findByRoomIdAndUserId(roomId,currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "not a participant of this room"));

        if ("direct".equalsIgnoreCase(room.getRoomType())){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"direct chat cannot be left");
        }
        boolean isAdmin = room.getCreator().getId().equals(currentUser.getId());
        long count = participantRepository.countByRoomId(roomId);

        if(isAdmin && count >1 ){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"transfer admin before leaving");
        }

        if(isAdmin){
            roomRepository.delete(room);
            return;
        }
        participantRepository.delete(participant);

    }


    @Transactional
    public  RoomDetailResponse transferAdmin(UUID roomId,UUID newAdminId,User currentUser){
        if (newAdminId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"newAdminId is required");
        }
        ChatRoom room = roomRepository.findById(roomId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND,"room not found"));

        if(!room.getCreator().getId().equals(currentUser.getId())){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"only admin can transfer ownership");
        }

        if ("direct".equalsIgnoreCase(room.getRoomType())){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"direct chat cannot be left");
        }
        User newAdmin = userRepository.findById(newAdminId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND,"target user not found"));

        if(!participantRepository.existsByRoomIdAndUserId(roomId,newAdminId)){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"New admin must be a room member");
        }

        room.setCreator(newAdmin);
        roomRepository.save(room);

        return getRoom(roomId,currentUser);
    }



    private RoomResponse toRoomResponse(ChatRoom room, User currentUser) {
        String displayTitle = room.getTitle();
        String displayAvatar = room.getAvatarUrl();

        if ("direct".equalsIgnoreCase(room.getRoomType())) {
            List<ChatParticipant> participants = participantRepository.findAllByRoomId(room.getId());
            Optional<ChatParticipant> other = participants.stream()
                    .filter(p -> !p.getUser().getId().equals(currentUser.getId()))
                    .findFirst();
            if (other.isPresent()) {
                User ou = other.get().getUser();
                displayTitle = ou.getUsername() != null ? ou.getUsername() : ou.getEmail().split("@")[0];
                displayAvatar = ou.getAvatarUrl();
            }
        }

        List<Message> msgs = room.getMessages();
        String lastMsg = null;
        Instant lastMsgAt = room.getCreatedAt();
        if (msgs != null && !msgs.isEmpty()) {
            Message last = msgs.get(msgs.size() - 1);
            lastMsg = last.getOriginalText();
            lastMsgAt = last.getCreatedAt();
        }

        int count = room.getParticipants() != null ? room.getParticipants().size() : 1;

        return RoomResponse.builder()
                .id(room.getId())
                .title(displayTitle)
                .sourceLang(room.getSourceLang())
                .targetLang(room.getTargetLang())
                .roomType(room.getRoomType())
                .description(room.getDescription())
                .emoji(room.getEmoji())
                .avatarUrl(displayAvatar)
                .isPrivate(room.getIsPrivate())
                .membersCount(count)
                .lastMessage(lastMsg)
                .lastMessageAt(lastMsgAt)
                .build();
    }
}
