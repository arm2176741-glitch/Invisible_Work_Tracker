package com.iwt.invisibleworktracker.dto.workentry;

import com.iwt.invisibleworktracker.entity.workentry.WorkEntryStatus;
import jakarta.validation.constraints.NotNull;

public class UpdateWorkEntryStatusRequest {

    @NotNull(message = "Status is required")
    private WorkEntryStatus status;

    public UpdateWorkEntryStatusRequest() {
    }

    public WorkEntryStatus getStatus() {
        return status;
    }

    public void setStatus(WorkEntryStatus status) {
        this.status = status;
    }
}
