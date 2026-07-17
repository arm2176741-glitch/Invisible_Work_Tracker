package com.iwt.invisibleworktracker.service;

import com.iwt.invisibleworktracker.dto.report.ReportPhotoContent;
import com.iwt.invisibleworktracker.entity.report.Report;
import com.iwt.invisibleworktracker.entity.user.User;

public interface ReportService {

    Report generateReport(User currentUser, Long workEntryId);

    Report getReport(User currentUser, Long reportId);

    ReportPhotoContent getReportPhotoContent(
            User currentUser,
            Long reportId,
            Long photoId
    );
}
