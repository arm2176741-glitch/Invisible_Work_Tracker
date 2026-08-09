package com.iwt.invisibleworktracker.dto.report;

import java.util.List;

public record ReportSnapshotV1(
        int schemaVersion,
        String reportNumber,
        String generatedAt,
        ReportOrganizationSnapshot organization,
        ReportWorkEntrySnapshot workEntry,
        List<ReportEvidenceSnapshot> photos
) {
}
