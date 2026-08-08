package com.iwt.invisibleworktracker.service;

import com.iwt.invisibleworktracker.dto.report.ReportPhotoContent;
import com.iwt.invisibleworktracker.dto.report.ReportShareLinkResponse;
import com.iwt.invisibleworktracker.entity.report.Report;
import com.iwt.invisibleworktracker.entity.user.User;

public interface ReportService {

    Report generateReport(User currentUser, Long workEntryId);

    Report getReport(User currentUser, Long reportId);

    Report markReportReviewed(User currentUser, Long reportId);

    ReportShareLinkResponse createShareLink(User currentUser, Long reportId);

    ReportShareLinkResponse revokeShareLink(User currentUser, Long reportId, Long shareLinkId);

    Report getSharedReport(String rawToken);

    ReportPhotoContent getSharedReportPhotoContent(String rawToken, Long photoId);

    ReportPhotoContent getReportPhotoContent(
            User currentUser,
            Long reportId,
            Long photoId
    );
}
