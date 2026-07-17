package com.iwt.invisibleworktracker.controller;

import com.iwt.invisibleworktracker.dto.report.ReportPhotoContent;
import com.iwt.invisibleworktracker.dto.report.ReportResponse;
import com.iwt.invisibleworktracker.entity.report.Report;
import com.iwt.invisibleworktracker.entity.user.User;
import com.iwt.invisibleworktracker.service.ReportService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReportController {

    private final ReportService reportService;

    public ReportController(
            ReportService reportService
    ) {
        this.reportService = reportService;
    }

    @PostMapping("/work-entries/{workEntryId}/reports")
    public ResponseEntity<ReportResponse> generateReport(
            @PathVariable Long workEntryId,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();

        Report report = reportService.generateReport(
                currentUser,
                workEntryId
        );

        return ResponseEntity.ok(ReportResponse.from(report));
    }

    @GetMapping("/reports/{reportId}")
    public ResponseEntity<ReportResponse> getReport(
            @PathVariable Long reportId,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();

        Report report = reportService.getReport(
                currentUser,
                reportId
        );

        return ResponseEntity.ok(ReportResponse.from(report));
    }

    @GetMapping("/reports/{reportId}/photos/{photoId}/content")
    public ResponseEntity<byte[]> getReportPhotoContent(
            @PathVariable Long reportId,
            @PathVariable Long photoId,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();

        ReportPhotoContent content =
                reportService.getReportPhotoContent(
                        currentUser,
                        reportId,
                        photoId
                );

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.contentType()))
                .header("Content-Disposition", "inline")
                .header("Cache-Control", "private, max-age=300")
                .header("X-Content-Type-Options", "nosniff")
                .body(content.bytes());
    }
}
