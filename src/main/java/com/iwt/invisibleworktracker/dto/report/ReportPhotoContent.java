package com.iwt.invisibleworktracker.dto.report;

public record ReportPhotoContent(
        byte[] bytes,
        String contentType
) {
}
