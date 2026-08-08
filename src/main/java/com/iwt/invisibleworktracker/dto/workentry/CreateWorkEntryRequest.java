package com.iwt.invisibleworktracker.dto.workentry;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public class CreateWorkEntryRequest {

    @NotNull(message = "Organization id is required")
    private Long organizationId;

    @NotBlank(message = "Job name is required")
    @Size(max = 150, message = "Job name cannot exceed 150 characters")
    private String jobName;

    @NotBlank(message = "Job address is required")
    @Size(max = 255, message = "Job address cannot exceed 255 characters")
    private String jobAddress;

    @NotBlank(message = "Customer name is required")
    @Size(max = 150, message = "Customer name cannot exceed 150 characters")
    private String customerName;

    @Size(max = 40, message = "Customer phone cannot exceed 40 characters")
    private String customerPhone;

    @Size(max = 150, message = "Customer email cannot exceed 150 characters")
    private String customerEmail;

    @Size(max = 150, message = "Customer contact person cannot exceed 150 characters")
    private String customerContactName;

    @NotBlank(message = "Work type is required")
    @Size(max = 100, message = "Work type cannot exceed 100 characters")
    private String workType;

    @Size(max = 2000, message = "Description cannot exceed 2000 characters")
    private String description;

    private LocalDate workDate;

    private LocalTime scheduledStartTime;

    @Size(max = 100, message = "Arrival window cannot exceed 100 characters")
    private String arrivalWindow;

    @Size(max = 80, message = "Estimated duration cannot exceed 80 characters")
    private String estimatedDuration;

    @Size(max = 500, message = "Assigned crew cannot exceed 500 characters")
    private String assignedCrew;

    @Size(max = 1000, message = "Site access notes cannot exceed 1000 characters")
    private String siteAccessNotes;

    @Size(max = 1000, message = "Internal notes cannot exceed 1000 characters")
    private String internalNotes;

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

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCustomerPhone() {
        return customerPhone;
    }

    public void setCustomerPhone(String customerPhone) {
        this.customerPhone = customerPhone;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public String getCustomerContactName() {
        return customerContactName;
    }

    public void setCustomerContactName(String customerContactName) {
        this.customerContactName = customerContactName;
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

    public LocalTime getScheduledStartTime() {
        return scheduledStartTime;
    }

    public void setScheduledStartTime(LocalTime scheduledStartTime) {
        this.scheduledStartTime = scheduledStartTime;
    }

    public String getArrivalWindow() {
        return arrivalWindow;
    }

    public void setArrivalWindow(String arrivalWindow) {
        this.arrivalWindow = arrivalWindow;
    }

    public String getEstimatedDuration() {
        return estimatedDuration;
    }

    public void setEstimatedDuration(String estimatedDuration) {
        this.estimatedDuration = estimatedDuration;
    }

    public String getAssignedCrew() {
        return assignedCrew;
    }

    public void setAssignedCrew(String assignedCrew) {
        this.assignedCrew = assignedCrew;
    }

    public String getSiteAccessNotes() {
        return siteAccessNotes;
    }

    public void setSiteAccessNotes(String siteAccessNotes) {
        this.siteAccessNotes = siteAccessNotes;
    }

    public String getInternalNotes() {
        return internalNotes;
    }

    public void setInternalNotes(String internalNotes) {
        this.internalNotes = internalNotes;
    }
}
