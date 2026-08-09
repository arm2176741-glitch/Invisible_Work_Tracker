package com.iwt.invisibleworktracker.dto.report;

public record ReportWorkEntrySnapshot(
        Long id,
        String jobName,
        String jobAddress,
        String customerName,
        String customerPhone,
        String customerEmail,
        String customerContactName,
        String workType,
        String plannedScope,
        String workPerformedSummary,
        String description,
        String workDate,
        String scheduledStartTime,
        String arrivalWindow,
        String estimatedDuration,
        String status
) {
}
