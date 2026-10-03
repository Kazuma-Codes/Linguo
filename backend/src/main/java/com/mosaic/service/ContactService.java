package com.mosaic.service;

import com.mosaic.model.dto.ContactRequestDto;
import com.mosaic.model.dto.ContactResponse;
import com.mosaic.model.entity.ChatRoom;
import com.mosaic.model.entity.Contact;
import com.mosaic.model.entity.ContactRequest;
import com.mosaic.model.entity.User;
import com.mosaic.repository.ChatRoomRepository;
import com.mosaic.repository.ContactRequestRepository;
import com.mosaic.repository.ContactRepository;
import com.mosaic.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ContactService {

    private final ContactRepository contactRepository;
    private final ContactRequestRepository contactRequestRepository;
    private final UserRepository userRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final RoomService roomService;

    public ContactService(ContactRepository contactRepository,
                          ContactRequestRepository contactRequestRepository,
                          UserRepository userRepository,
                          ChatRoomRepository chatRoomRepository,
                          RoomService roomService) {
        this.contactRepository = contactRepository;
        this.contactRequestRepository = contactRequestRepository;
        this.userRepository = userRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.roomService = roomService;
    }

    @Transactional(readOnly = true)
    public List<ContactResponse> listContacts(User currentUser) {
        List<Contact> contacts = contactRepository.findAllByUserIdOrderByCreatedAtDesc(currentUser.getId());
        return contacts.stream().map(c -> {
            User cu = c.getContactUser();
            Optional<ChatRoom> directRoom = chatRoomRepository.findDirectRoomBetweenUsers(currentUser.getId(), cu.getId());
            return new ContactResponse(
                    c.getId(),
                    cu.getId(),
                    cu.getEmail(),
                    cu.displayName(),
                    cu.getAvatarUrl(),
                    cu.getAbout(),
                    cu.getPhone(),
                    cu.getPreferredLanguage(),
                    directRoom.map(ChatRoom::getId).orElse(null),
                    c.getCreatedAt()
            );
        }).toList();
    }

    @Transactional
    public ContactResponse addContact(UUID contactUserId, User currentUser) {
        if (contactUserId.equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot add yourself as a contact");
        }

        User targetUser = userRepository.findById(contactUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target user not found"));

        if (!contactRepository.existsByUserIdAndContactUserId(currentUser.getId(), contactUserId)) {
            Contact contact = Contact.builder()
                    .user(currentUser)
                    .contactUser(targetUser)
                    .build();
            contact = contactRepository.save(contact);

            // Friendship is mutual: the added friend sees you in their list too
            // (same as acceptRequest, which creates both directions).
            if (!contactRepository.existsByUserIdAndContactUserId(contactUserId, currentUser.getId())) {
                contactRepository.save(Contact.builder()
                        .user(targetUser)
                        .contactUser(currentUser)
                        .build());
            }

            Optional<ChatRoom> directRoom = chatRoomRepository.findDirectRoomBetweenUsers(currentUser.getId(), contactUserId);
            return new ContactResponse(
                    contact.getId(),
                    targetUser.getId(),
                    targetUser.getEmail(),
                    targetUser.getUsername() != null ? targetUser.getUsername() : targetUser.getEmail().split("@")[0],
                    targetUser.getAvatarUrl(),
                    targetUser.getAbout(),
                    targetUser.getPhone(),
                    targetUser.getPreferredLanguage(),
                    directRoom.map(ChatRoom::getId).orElse(null),
                    contact.getCreatedAt()
            );
        }

        Contact existing = contactRepository.findByUserIdAndContactUserId(currentUser.getId(), contactUserId).get();
        Optional<ChatRoom> directRoom = chatRoomRepository.findDirectRoomBetweenUsers(currentUser.getId(), contactUserId);
        return new ContactResponse(
                existing.getId(),
                targetUser.getId(),
                targetUser.getEmail(),
                targetUser.getUsername() != null ? targetUser.getUsername() : targetUser.getEmail().split("@")[0],
                targetUser.getAvatarUrl(),
                targetUser.getAbout(),
                targetUser.getPhone(),
                targetUser.getPreferredLanguage(),
                directRoom.map(ChatRoom::getId).orElse(null),
                existing.getCreatedAt()
        );
    }

    @Transactional
    public void removeContact(UUID contactUserId, User currentUser) {
        // Unfriend is symmetric: remove both directions so neither side
        // keeps a stale one-way row.
        contactRepository.deleteByUserIdAndContactUserId(currentUser.getId(), contactUserId);
        contactRepository.deleteByUserIdAndContactUserId(contactUserId, currentUser.getId());
    }

    @Transactional(readOnly = true)
    public List<ContactRequestDto> listPendingRequests(User currentUser) {
        List<ContactRequest> requests = contactRequestRepository.findAllByToUserIdAndStatusOrderByCreatedAtDesc(currentUser.getId(), "pending");
        return requests.stream().map(r -> new ContactRequestDto(
                r.getId(),
                r.getFromUser().getId(),
                r.getFromUser().getEmail(),
                r.getFromUser().getUsername() != null ? r.getFromUser().getUsername() : r.getFromUser().getEmail().split("@")[0],
                r.getFromUser().getAvatarUrl(),
                r.getContent(),
                r.getStatus(),
                r.getCreatedAt()
        )).toList();
    }

    @Transactional
    public ContactRequestDto sendRequest(UUID targetUserId, String content, User currentUser) {
        if (targetUserId.equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot send request to yourself");
        }

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target user not found"));

        ContactRequest request = contactRequestRepository.findByFromUserIdAndToUserId(currentUser.getId(), targetUserId)
                .orElse(ContactRequest.builder()
                        .fromUser(currentUser)
                        .toUser(targetUser)
                        .content(content != null ? content : "Hey, I'd like to connect on Linguo!")
                        .status("pending")
                        .build());

        request.setStatus("pending");
        if (content != null) {
            request.setContent(content);
        }
        request = contactRequestRepository.save(request);

        return new ContactRequestDto(
                request.getId(),
                currentUser.getId(),
                currentUser.getEmail(),
                currentUser.getUsername(),
                currentUser.getAvatarUrl(),
                request.getContent(),
                request.getStatus(),
                request.getCreatedAt()
        );
    }

    @Transactional
    public void acceptRequest(UUID requestId, User currentUser) {
        ContactRequest request = contactRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));

        if (!request.getToUser().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to accept this request");
        }

        request.setStatus("accepted");
        contactRequestRepository.save(request);

        User fromUser = request.getFromUser();

        // Mutually create contacts
        if (!contactRepository.existsByUserIdAndContactUserId(currentUser.getId(), fromUser.getId())) {
            contactRepository.save(Contact.builder().user(currentUser).contactUser(fromUser).build());
        }
        if (!contactRepository.existsByUserIdAndContactUserId(fromUser.getId(), currentUser.getId())) {
            contactRepository.save(Contact.builder().user(fromUser).contactUser(currentUser).build());
        }

        // Ensure a direct room exists
        roomService.getOrCreateDirectRoom(fromUser.getId(), currentUser);
    }

    @Transactional
    public void declineRequest(UUID requestId, User currentUser) {
        ContactRequest request = contactRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));

        if (!request.getToUser().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to decline this request");
        }

        request.setStatus("declined");
        contactRequestRepository.save(request);
    }
}
