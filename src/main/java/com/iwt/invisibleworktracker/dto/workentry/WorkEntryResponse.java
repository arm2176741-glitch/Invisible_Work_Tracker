package com.iwt.invisibleworktracker.dto.workentry;

import com.iwt.invisibleworktracker.dto.report.ReportResponse;
import com.iwt.invisibleworktracker.entity.report.Report;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntry;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntryStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public class WorkEntryResponse {

    private Long id;
    private Long organizationId;
    private Long userId;
    private String jobName;
    private String jobAddress;
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private String customerContactName;
    private String workType;
    private String description;
    private String plannedScope;
    private String workPerformedSummary;
    private WorkEntryStatus status;
    private LocalDate workDate;
    private LocalTime scheduledStartTime;
    private String arrivalWindow;
    private String estimatedDuration;
    private String assignedCrew;
    private String siteAccessNotes;
    private String internalNotes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private ReportResponse report;

    public WorkEntryResponse() {
    }

    public WorkEntryResponse(
            Long id,
            Long organizationId,
            Long userId,
            String jobName,
            String jobAddress,
            String customerName,
            String customerPhone,
            String customerEmail,
            String customerContactName,
            String workType,
            String description,
            String plannedScope,
            String workPerformedSummary,
            WorkEntryStatus status,
            LocalDate workDate,
            LocalTime scheduledStartTime,
            String arrivalWindow,
            String estimatedDuration,
            String assignedCrew,
            String siteAccessNotes,
            String internalNotes,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            ReportResponse report
    ) {
        this.id = id;
        this.organizationId = organizationId;
        this.userId = userId;
        this.jobName = jobName;
        this.jobAddress = jobAddress;
        this.customerName = customerName;
        this.customerPhone = customerPhone;
        this.customerEmail = customerEmail;
        this.customerContactName = customerContactName;
        this.workType = workType;
        this.description = description;
        this.plannedScope = plannedScope;
        this.workPerformedSummary = workPerformedSummary;
        this.status = status;
        this.workDate = workDate;
        this.scheduledStartTime = scheduledStartTime;
        this.arrivalWindow = arrivalWindow;
        this.estimatedDuration = estimatedDuration;
        this.assignedCrew = assignedCrew;
        this.siteAccessNotes = siteAccessNotes;
        this.internalNotes = internalNotes;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.report = report;
    }

    public static WorkEntryResponse from(WorkEntry workEntry) {
        return from(workEntry, null);
    }

    public static WorkEntryResponse from(
            WorkEntry workEntry,
            Report report
    ) {
        String plannedScope =
                workEntry.getPlannedScope() == null ? "" : workEntry.getPlannedScope();
        String workPerformedSummary =
                workEntry.getWorkPerformedSummary() == null
                        ? ""
                        : workEntry.getWorkPerformedSummary();

        return new WorkEntryResponse(
                workEntry.getId(),
                workEntry.getOrganization().getId(),
                workEntry.getUser().getId(),
                workEntry.getJobName(),
                workEntry.getJobAddress(),
                workEntry.getCustomerName(),
                workEntry.getCustomerPhone(),
                workEntry.getCustomerEmail(),
                workEntry.getCustomerContactName(),
                workEntry.getWorkType(),
                workPerformedSummary,
                plannedScope,
                workPerformedSummary,
                workEntry.getStatus(),
                workEntry.getWorkDate(),
                workEntry.getScheduledStartTime(),
                workEntry.getArrivalWindow(),
                workEntry.getEstimatedDuration(),
                workEntry.getAssignedCrew(),
                workEntry.getSiteAccessNotes(),
                workEntry.getInternalNotes(),
                workEntry.getCreatedAt(),
                workEntry.getUpdatedAt(),
                report == null ? null : ReportResponse.from(report)
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

    public String getCustomerName() {
        return customerName;
    }

    public String getCustomerPhone() {
        return customerPhone;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public String getCustomerContactName() {
        return customerContactName;
    }

    public String getWorkType() {
        return workType;
    }

    public String getDescription() {
        return description;
    }

    public String getPlannedScope() {
        return plannedScope;
    }

    public String getWorkPerformedSummary() {
        return workPerformedSummary;
    }

    public WorkEntryStatus getStatus() {
        return status;
    }

    public LocalDate getWorkDate() {
        return workDate;
    }

    public LocalTime getScheduledStartTime() {
        return scheduledStartTime;
    }

    public String getArrivalWindow() {
        return arrivalWindow;
    }

    public String getEstimatedDuration() {
        return estimatedDuration;
    }

    public String getAssignedCrew() {
        return assignedCrew;
    }

    public String getSiteAccessNotes() {
        return siteAccessNotes;
    }

    public String getInternalNotes() {
        return internalNotes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public ReportResponse getReport() {
        return report;
    }
}
