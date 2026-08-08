package com.iwt.invisibleworktracker.dto.workentry;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UpdateWorkEntrySummaryRequest {

    @NotBlank(message = "Work performed summary is required")
    @Size(max = 2000, message = "Work performed summary cannot exceed 2000 characters")
    private String description;

    public UpdateWorkEntrySummaryRequest() {
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
