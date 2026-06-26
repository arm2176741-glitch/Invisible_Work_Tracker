package com.iwt.invisibleworktracker.dto.workentry;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class CreateWorkEntryRequest {

    @NotNull(message = "Organization id is required")
    private Long organizationId;

    @NotBlank(message = "Job name is required")
    @Size(max = 150, message = "Job name cannot exceed 150 characters")
    private String jobName;

    @NotBlank(message = "Job address is required")
    @Size(max = 255, message = "Job address cannot exceed 255 characters")
    private String jobAddress;

    @NotBlank(message = "Work type is required")
    @Size(max = 100, message = "Work type cannot exceed 100 characters")
    private String workType;

    @NotBlank(message = "Description is required")
    @Size(max = 2000, message = "Description cannot exceed 2000 characters")
    private String description;

    @NotNull(message = "Work date is required")
    private LocalDate workDate;

    public CreateWorkEntryRequest() {
    }

    public Long getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(Long organizationId) {
        this.organizationId = organizationId;
    }

    public String getJobName() {
        return jobName;
    }

    public void setJobName(String jobName) {
        this.jobName = jobName;
    }

    public String getJobAddress() {
        return jobAddress;
    }

    public void setJobAddress(String jobAddress) {
        this.jobAddress = jobAddress;
    }

    public String getWorkType() {
        return workType;
    }

    public void setWorkType(String workType) {
        this.workType = workType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getWorkDate() {
        return workDate;
    }

    public void setWorkDate(LocalDate workDate) {
        this.workDate = workDate;
    }
}
