package com.iwt.invisibleworktracker.dto.workentry;

public record WorkEntryPhotoContent(
        byte[] bytes,
        String contentType
) {
}
