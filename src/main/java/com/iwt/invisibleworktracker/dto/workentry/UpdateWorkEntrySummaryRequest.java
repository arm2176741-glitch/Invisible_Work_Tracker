package com.iwt.invisibleworktracker.dto.workentry;

import jakarta.validation.constraints.Size;

public class UpdateWorkEntrySummaryRequest {

    @Size(max = 2000, message = "Work performed summary cannot exceed 2000 characters")
    private String workPerformedSummary;

    @Deprecated
    @Size(max = 2000, message = "Work performed summary cannot exceed 2000 characters")
    private String description;

    public UpdateWorkEntrySummaryRequest() {
    }

    public String getWorkPerformedSummary() {
        return workPerformedSummary;
    }

    public void setWorkPerformedSummary(String workPerformedSummary) {
        this.workPerformedSummary = workPerformedSummary;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
