package com.iwt.invisibleworktracker.dto.workentry;

import com.iwt.invisibleworktracker.entity.workentry.PhotoCategory;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntryPhoto;

import java.time.LocalDateTime;

public class WorkEntryPhotoResponse {

    private Long id;
    private Long workEntryId;
    private Long uploadedByUserId;
    private PhotoCategory category;
    private String originalFilename;
    private String contentType;
    private long fileSizeBytes;
    private LocalDateTime createdAt;

    public WorkEntryPhotoResponse() {
    }

    public WorkEntryPhotoResponse(
            Long id,
            Long workEntryId,
            Long uploadedByUserId,
            PhotoCategory category,
            String originalFilename,
            String contentType,
            long fileSizeBytes,
            LocalDateTime createdAt
    ) {
        this.id = id;
        this.workEntryId = workEntryId;
        this.uploadedByUserId = uploadedByUserId;
        this.category = category;
        this.originalFilename = originalFilename;
        this.contentType = contentType;
        this.fileSizeBytes = fileSizeBytes;
        this.createdAt = createdAt;
    }

    public static WorkEntryPhotoResponse from(WorkEntryPhoto photo) {
        return new WorkEntryPhotoResponse(
                photo.getId(),
                photo.getWorkEntry().getId(),
                photo.getUploadedBy().getId(),
                photo.getCategory(),
                photo.getOriginalFilename(),
                photo.getContentType(),
                photo.getFileSizeBytes(),
                photo.getCreatedAt()
        );
    }

    public Long getId() {
        return id;
    }

    public Long getWorkEntryId() {
        return workEntryId;
    }

    public Long getUploadedByUserId() {
        return uploadedByUserId;
    }

    public PhotoCategory getCategory() {
        return category;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getContentType() {
        return contentType;
    }

    public long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
