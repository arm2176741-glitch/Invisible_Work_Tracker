package com.iwt.invisibleworktracker.dto.workentry;

import com.iwt.invisibleworktracker.entity.WorkEntry;
import com.iwt.invisibleworktracker.entity.WorkEntryStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class WorkEntryResponse {

    private Long id;
    private Long organizationId;
    private Long userId;
    private String jobName;
    private String jobAddress;
    private String workType;
    private String description;
    private WorkEntryStatus status;
    private LocalDate workDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public WorkEntryResponse() {
    }

    public WorkEntryResponse(
            Long id,
            Long organizationId,
            Long userId,
            String jobName,
            String jobAddress,
            String workType,
            String description,
            WorkEntryStatus status,
            LocalDate workDate,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        this.id = id;
        this.organizationId = organizationId;
        this.userId = userId;
        this.jobName = jobName;
        this.jobAddress = jobAddress;
        this.workType = workType;
        this.description = description;
        this.status = status;
        this.workDate = workDate;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static WorkEntryResponse from(WorkEntry workEntry) {
        return new WorkEntryResponse(
                workEntry.getId(),
                workEntry.getOrganization().getId(),
                workEntry.getUser().getId(),
                workEntry.getJobName(),
                workEntry.getJobAddress(),
                workEntry.getWorkType(),
                workEntry.getDescription(),
                workEntry.getStatus(),
                workEntry.getWorkDate(),
                workEntry.getCreatedAt(),
                workEntry.getUpdatedAt()
        );
    }

    public Long getId() {
        return id;
    }

    public Long getOrganizationId() {
        return organizationId;
    }

    public Long getUserId() {
        return userId;
    }

    public String getJobName() {
        return jobName;
    }

    public String getJobAddress() {
        return jobAddress;
    }

    public String getWorkType() {
        return workType;
    }

    public String getDescription() {
        return description;
    }

    public WorkEntryStatus getStatus() {
        return status;
    }

    public LocalDate getWorkDate() {
        return workDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
