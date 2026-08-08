package com.iwt.invisibleworktracker.dto.report;

import com.iwt.invisibleworktracker.entity.report.ReportShareLink;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ReportShareLinkResponse {

    private Long id;
    private Long reportId;
    private String shareUrl;
    private LocalDateTime expiresAt;
    private LocalDateTime revokedAt;

    public static ReportShareLinkResponse from(
            ReportShareLink shareLink,
            String shareUrl
    ) {
        return ReportShareLinkResponse.builder()
                .id(shareLink.getId())
                .reportId(shareLink.getReport().getId())
                .shareUrl(shareUrl)
                .expiresAt(shareLink.getExpiresAt())
                .revokedAt(shareLink.getRevokedAt())
                .build();
    }
}
