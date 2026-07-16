package com.iwt.invisibleworktracker.service.impl;

import com.iwt.invisibleworktracker.dto.workentry.WorkEntryPhotoResponse;
import com.iwt.invisibleworktracker.entity.workentry.PhotoCategory;
import com.iwt.invisibleworktracker.entity.user.User;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntry;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntryPhoto;
import com.iwt.invisibleworktracker.repository.WorkEntryPhotoRepository;
import com.iwt.invisibleworktracker.repository.WorkEntryRepository;
import com.iwt.invisibleworktracker.service.OrganizationService;
import com.iwt.invisibleworktracker.service.WorkEntryPhotoService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class WorkEntryPhotoServiceImpl implements WorkEntryPhotoService {

    private static final long MAX_PHOTO_BYTES = 20L * 1024L * 1024L;
    private static final String IMAGE_JPEG = "image/jpeg";
    private static final String IMAGE_PNG = "image/png";
    private static final String IMAGE_WEBP = "image/webp";
    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of(IMAGE_JPEG, IMAGE_PNG, IMAGE_WEBP);

    private final WorkEntryRepository workEntryRepository;
    private final WorkEntryPhotoRepository photoRepository;
    private final OrganizationService organizationService;
    private final Path uploadRoot;

    public WorkEntryPhotoServiceImpl(
            WorkEntryRepository workEntryRepository,
            WorkEntryPhotoRepository photoRepository,
            OrganizationService organizationService,
            @Value("${fieldproof.uploads.work-entry-photos-dir:uploads/work-entry-photos}")
            String uploadDirectory
    ) {
        this.workEntryRepository = workEntryRepository;
        this.photoRepository = photoRepository;
        this.organizationService = organizationService;
        this.uploadRoot = Paths.get(uploadDirectory)
                .toAbsolutePath()
                .normalize();
    }

    @Override
    @Transactional
    public WorkEntryPhotoResponse uploadPhoto(
            User currentUser,
            Long workEntryId,
            String category,
            MultipartFile file
    ) {
        WorkEntry workEntry = requireAccessibleWorkEntry(currentUser, workEntryId);
        PhotoCategory photoCategory = parseCategory(category);
        byte[] fileBytes = validateAndReadFile(file);
        String contentType = normalizeContentType(file.getContentType());
        String storedFilename =
                UUID.randomUUID() + extensionForContentType(contentType);
        String originalFilename = normalizeOriginalFilename(file.getOriginalFilename());

        Path workEntryDirectory = uploadRoot
                .resolve(String.valueOf(workEntry.getId()))
                .normalize();

        ensurePathStaysInside(workEntryDirectory, uploadRoot);
        createDirectories(workEntryDirectory);

        Path destination = workEntryDirectory
                .resolve(storedFilename)
                .normalize();

        ensurePathStaysInside(destination, workEntryDirectory);
        writeFile(destination, fileBytes);
        registerRollbackCleanup(destination);

        String storagePath =
                workEntry.getId() + "/" + storedFilename;

        WorkEntryPhoto photo = WorkEntryPhoto.builder()
                .workEntry(workEntry)
                .uploadedBy(currentUser)
                .category(photoCategory)
                .originalFilename(originalFilename)
                .storedFilename(storedFilename)
                .contentType(contentType)
                .fileSizeBytes(fileBytes.length)
                .storagePath(storagePath)
                .build();

        try {
            return WorkEntryPhotoResponse.from(photoRepository.save(photo));
        } catch (RuntimeException ex) {
            deleteStoredFile(destination);
            throw ex;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkEntryPhotoResponse> listPhotos(
            User currentUser,
            Long workEntryId
    ) {
        WorkEntry workEntry = requireAccessibleWorkEntry(currentUser, workEntryId);

        return photoRepository
                .findByWorkEntryOrderByCreatedAtAscIdAsc(workEntry)
                .stream()
                .map(WorkEntryPhotoResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public void deletePhoto(
            User currentUser,
            Long workEntryId,
            Long photoId
    ) {
        WorkEntry workEntry = requireAccessibleWorkEntry(currentUser, workEntryId);

        if (photoId == null) {
            throw new IllegalArgumentException("Photo id is required");
        }

        WorkEntryPhoto photo = photoRepository
                .findByIdAndWorkEntry(photoId, workEntry)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Photo not found"
                ));

        Path storedFile = uploadRoot
                .resolve(photo.getStoragePath())
                .normalize();

        ensurePathStaysInside(storedFile, uploadRoot);

        photoRepository.delete(photo);
        deleteStoredFile(storedFile);
    }

    private WorkEntry requireAccessibleWorkEntry(
            User currentUser,
            Long workEntryId
    ) {
        if (workEntryId == null) {
            throw new IllegalArgumentException("Work entry id is required");
        }

        WorkEntry workEntry = workEntryRepository
                .findById(workEntryId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Work entry not found"
                ));

        organizationService.requireActiveOrganizationMember(
                currentUser,
                workEntry.getOrganization().getId()
        );

        return workEntry;
    }

    private PhotoCategory parseCategory(String category) {
        if (category == null || category.trim().isEmpty()) {
            throw new IllegalArgumentException("Photo category is required");
        }

        try {
            return PhotoCategory.valueOf(
                    category.trim().toUpperCase(Locale.ROOT)
            );
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Photo category must be BEFORE, DURING, or AFTER"
            );
        }
    }

    private byte[] validateAndReadFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Photo file is required");
        }

        if (file.getSize() > MAX_PHOTO_BYTES) {
            throw new ResponseStatusException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "Photo cannot exceed 20MB"
            );
        }

        String contentType = normalizeContentType(file.getContentType());

        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException(
                    "Photo must be a JPEG, PNG, or WebP image"
            );
        }

        byte[] fileBytes;

        try {
            fileBytes = file.getBytes();
        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Photo could not be read"
            );
        }

        if (fileBytes.length > MAX_PHOTO_BYTES) {
            throw new ResponseStatusException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "Photo cannot exceed 20MB"
            );
        }

        if (!hasExpectedSignature(fileBytes, contentType)) {
            throw new IllegalArgumentException(
                    "Photo content does not match its file type"
            );
        }

        return fileBytes;
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null) {
            return "";
        }

        return contentType.trim().toLowerCase(Locale.ROOT);
    }

    private boolean hasExpectedSignature(
            byte[] fileBytes,
            String contentType
    ) {
        return switch (contentType) {
            case IMAGE_JPEG -> hasJpegSignature(fileBytes);
            case IMAGE_PNG -> hasPngSignature(fileBytes);
            case IMAGE_WEBP -> hasWebpSignature(fileBytes);
            default -> false;
        };
    }

    private boolean hasJpegSignature(byte[] fileBytes) {
        return fileBytes.length >= 3
                && unsignedByte(fileBytes[0]) == 0xFF
                && unsignedByte(fileBytes[1]) == 0xD8
                && unsignedByte(fileBytes[2]) == 0xFF;
    }

    private boolean hasPngSignature(byte[] fileBytes) {
        return fileBytes.length >= 8
                && unsignedByte(fileBytes[0]) == 0x89
                && unsignedByte(fileBytes[1]) == 0x50
                && unsignedByte(fileBytes[2]) == 0x4E
                && unsignedByte(fileBytes[3]) == 0x47
                && unsignedByte(fileBytes[4]) == 0x0D
                && unsignedByte(fileBytes[5]) == 0x0A
                && unsignedByte(fileBytes[6]) == 0x1A
                && unsignedByte(fileBytes[7]) == 0x0A;
    }

    private boolean hasWebpSignature(byte[] fileBytes) {
        if (fileBytes.length < 12) {
            return false;
        }

        String riffHeader =
                new String(fileBytes, 0, 4, StandardCharsets.US_ASCII);
        String webpHeader =
                new String(fileBytes, 8, 4, StandardCharsets.US_ASCII);

        return riffHeader.equals("RIFF")
                && webpHeader.equals("WEBP");
    }

    private int unsignedByte(byte value) {
        return value & 0xFF;
    }

    private String extensionForContentType(String contentType) {
        return switch (contentType) {
            case IMAGE_JPEG -> ".jpg";
            case IMAGE_PNG -> ".png";
            case IMAGE_WEBP -> ".webp";
            default -> throw new IllegalArgumentException(
                    "Unsupported photo file type"
            );
        };
    }

    private String normalizeOriginalFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.trim().isEmpty()) {
            return "uploaded-photo";
        }

        String normalized = originalFilename
                .replace("\\", "/");

        int lastSlash = normalized.lastIndexOf("/");

        if (lastSlash >= 0) {
            normalized = normalized.substring(lastSlash + 1);
        }

        normalized = normalized.trim();

        if (normalized.isEmpty()) {
            return "uploaded-photo";
        }

        if (normalized.length() > 255) {
            return normalized.substring(normalized.length() - 255);
        }

        return normalized;
    }

    private void createDirectories(Path directory) {
        try {
            Files.createDirectories(directory);
        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Photo storage could not be prepared"
            );
        }
    }

    private void writeFile(
            Path destination,
            byte[] fileBytes
    ) {
        try {
            Files.write(destination, fileBytes);
        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Photo could not be stored"
            );
        }
    }

    private void ensurePathStaysInside(
            Path path,
            Path expectedParent
    ) {
        if (!path.normalize().startsWith(expectedParent.normalize())) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Invalid photo storage path"
            );
        }
    }

    private void deleteStoredFile(Path storedFile) {
        try {
            Files.deleteIfExists(storedFile);
        } catch (IOException ignored) {
            // Metadata deletion should not be blocked by a missing or locked local MVP file.
        }
    }

    private void registerRollbackCleanup(Path storedFile) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        if (status == STATUS_ROLLED_BACK) {
                            deleteStoredFile(storedFile);
                        }
                    }
                }
        );
    }
}
