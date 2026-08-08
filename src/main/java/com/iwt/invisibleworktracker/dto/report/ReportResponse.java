package com.iwt.invisibleworktracker.dto.report;

import com.iwt.invisibleworktracker.entity.report.Report;
import com.iwt.invisibleworktracker.entity.report.ReportStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ReportResponse {

    private Long id;
    private Long workEntryId;
    private String reportNumber;
    private ReportStatus status;
    private String snapshotJson;
    private LocalDateTime generatedAt;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;

    public static ReportResponse from(Report report) {
        return ReportResponse.builder()
                .id(report.getId())
                .workEntryId(report.getWorkEntry().getId())
                .reportNumber(report.getReportNumber())
                .status(report.getStatus())
                .snapshotJson(report.getSnapshotJson())
                .generatedAt(report.getGeneratedAt())
                .reviewedAt(report.getReviewedAt())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
