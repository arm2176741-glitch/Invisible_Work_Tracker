package com.iwt.invisibleworktracker.dto.report;

public record ReportEvidenceSnapshot(
        Long id,
        String category,
        String originalFilename,
        String caption,
        String contentType,
        long fileSizeBytes,
        String createdAt
) {
}
