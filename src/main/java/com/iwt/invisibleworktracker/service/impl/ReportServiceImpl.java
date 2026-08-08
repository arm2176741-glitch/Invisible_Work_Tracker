package com.iwt.invisibleworktracker.service.impl;

import com.iwt.invisibleworktracker.dto.report.ReportPhotoContent;
import com.iwt.invisibleworktracker.dto.report.ReportShareLinkResponse;
import com.iwt.invisibleworktracker.entity.organization.MembershipStatus;
import com.iwt.invisibleworktracker.entity.organization.Organization;
import com.iwt.invisibleworktracker.entity.organization.OrganizationMembership;
import com.iwt.invisibleworktracker.entity.report.Report;
import com.iwt.invisibleworktracker.entity.report.ReportShareLink;
import com.iwt.invisibleworktracker.entity.report.ReportStatus;
import com.iwt.invisibleworktracker.entity.user.User;
import com.iwt.invisibleworktracker.entity.workentry.PhotoCategory;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntry;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntryPhoto;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntryStatus;
import com.iwt.invisibleworktracker.repository.OrganizationMembershipRepository;
import com.iwt.invisibleworktracker.repository.ReportRepository;
import com.iwt.invisibleworktracker.repository.ReportShareLinkRepository;
import com.iwt.invisibleworktracker.repository.WorkEntryPhotoRepository;
import com.iwt.invisibleworktracker.repository.WorkEntryRepository;
import com.iwt.invisibleworktracker.service.OrganizationService;
import com.iwt.invisibleworktracker.service.ReportService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

@Service
public class ReportServiceImpl implements ReportService {

    private static final int SHARE_TOKEN_BYTES = 32;
    private static final int SHARE_LINK_DAYS = 30;

    private final ReportRepository reportRepository;
    private final ReportShareLinkRepository reportShareLinkRepository;
    private final WorkEntryRepository workEntryRepository;
    private final WorkEntryPhotoRepository photoRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final OrganizationService organizationService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Path uploadRoot;
    private final String shareBaseUrl;

    public ReportServiceImpl(
            ReportRepository reportRepository,
            ReportShareLinkRepository reportShareLinkRepository,
            WorkEntryRepository workEntryRepository,
            WorkEntryPhotoRepository photoRepository,
            OrganizationMembershipRepository membershipRepository,
            OrganizationService organizationService,
            @Value("${fieldproof.uploads.work-entry-photos-dir:uploads/work-entry-photos}")
            String uploadDirectory,
            @Value("${fieldproof.share-base-url:http://127.0.0.1:5174}")
            String shareBaseUrl
    ) {
        this.reportRepository = reportRepository;
        this.reportShareLinkRepository = reportShareLinkRepository;
        this.workEntryRepository = workEntryRepository;
        this.photoRepository = photoRepository;
        this.membershipRepository = membershipRepository;
        this.organizationService = organizationService;
        this.uploadRoot = Paths.get(uploadDirectory)
                .toAbsolutePath()
                .normalize();
        this.shareBaseUrl = shareBaseUrl;
    }

    @Override
    @Transactional
    public Report generateReport(
            User currentUser,
            Long workEntryId
    ) {
        WorkEntry workEntry = requireAccessibleWorkEntry(currentUser, workEntryId);

        return reportRepository
                .findByWorkEntry(workEntry)
                .orElseGet(() -> createReport(currentUser, workEntry));
    }

    @Override
    @Transactional(readOnly = true)
    public Report getReport(
            User currentUser,
            Long reportId
    ) {
        if (reportId == null) {
            throw new IllegalArgumentException("Report id is required");
        }

        Report report = reportRepository
                .findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Report not found"
                ));

        organizationService.requireActiveOrganizationMember(
                currentUser,
                report.getWorkEntry().getOrganization().getId()
        );

        return report;
    }

    @Override
    @Transactional
    public Report markReportReviewed(
            User currentUser,
            Long reportId
    ) {
        Report report = getReport(currentUser, reportId);

        if (report.getReviewedAt() == null) {
            report.setReviewedAt(LocalDateTime.now());
            return reportRepository.save(report);
        }

        return report;
    }

    @Override
    @Transactional
    public ReportShareLinkResponse createShareLink(
            User currentUser,
            Long reportId
    ) {
        Report report = getReport(currentUser, reportId);
        Organization organization = report.getWorkEntry().getOrganization();
        OrganizationMembership membership = membershipRepository
                .findByUserAndOrganizationAndStatus(
                        currentUser,
                        organization,
                        MembershipStatus.ACTIVE
                )
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You do not have access to this organization"
                ));
        String rawToken = generateUniqueShareToken();
        String tokenHash = hashToken(rawToken);

        ReportShareLink shareLink = ReportShareLink.builder()
                .report(report)
                .tokenHash(tokenHash)
                .createdByMembership(membership)
                .expiresAt(LocalDateTime.now().plusDays(SHARE_LINK_DAYS))
                .build();

        report.setStatus(ReportStatus.SHARED);
        ReportShareLink savedShareLink =
                reportShareLinkRepository.save(shareLink);

        return ReportShareLinkResponse.from(
                savedShareLink,
                buildShareUrl(rawToken)
        );
    }

    @Override
    @Transactional
    public ReportShareLinkResponse revokeShareLink(
            User currentUser,
            Long reportId,
            Long shareLinkId
    ) {
        Report report = getReport(currentUser, reportId);

        ReportShareLink shareLink = reportShareLinkRepository
                .findByIdAndReport(shareLinkId, report)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Report share link not found"
                ));

        if (shareLink.getRevokedAt() == null) {
            shareLink.setRevokedAt(LocalDateTime.now());
            reportShareLinkRepository.save(shareLink);
        }

        boolean hasActiveShareLink = reportShareLinkRepository
                .existsByReportAndRevokedAtIsNullAndExpiresAtAfter(
                        report,
                        LocalDateTime.now()
                );

        if (!hasActiveShareLink) {
            report.setStatus(ReportStatus.GENERATED);
        }

        return ReportShareLinkResponse.from(shareLink, null);
    }

    @Override
    @Transactional(readOnly = true)
    public Report getSharedReport(String rawToken) {
        ReportShareLink shareLink = getActiveShareLink(rawToken);

        return shareLink.getReport();
    }

    @Override
    @Transactional(readOnly = true)
    public ReportPhotoContent getSharedReportPhotoContent(
            String rawToken,
            Long photoId
    ) {
        Report report = getSharedReport(rawToken);

        return getReportPhotoContent(report, photoId);
    }

    @Override
    @Transactional(readOnly = true)
    public ReportPhotoContent getReportPhotoContent(
            User currentUser,
            Long reportId,
            Long photoId
    ) {
        if (photoId == null) {
            throw new IllegalArgumentException("Photo id is required");
        }

        Report report = getReport(currentUser, reportId);

        return getReportPhotoContent(report, photoId);
    }

    private ReportPhotoContent getReportPhotoContent(
            Report report,
            Long photoId
    ) {
        if (photoId == null) {
            throw new IllegalArgumentException("Photo id is required");
        }

        WorkEntryPhoto photo = photoRepository
                .findByIdAndWorkEntry(photoId, report.getWorkEntry())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Report photo not found"
                ));

        if (!reportSnapshotContainsPhoto(report, photoId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Report photo not found"
            );
        }

        Path storedFile = uploadRoot
                .resolve(photo.getStoragePath())
                .normalize();

        ensurePathStaysInside(storedFile, uploadRoot);

        try {
            return new ReportPhotoContent(
                    Files.readAllBytes(storedFile),
                    photo.getContentType()
            );
        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Report photo file not found"
            );
        }
    }

    private ReportShareLink getActiveShareLink(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Report share link not found"
            );
        }

        ReportShareLink shareLink = reportShareLinkRepository
                .findByTokenHashAndRevokedAtIsNull(hashToken(rawToken))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Report share link not found"
                ));

        if (!shareLink.getExpiresAt().isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(
                    HttpStatus.GONE,
                    "Report share link has expired"
            );
        }

        return shareLink;
    }

    private String generateUniqueShareToken() {
        String rawToken;

        do {
            byte[] randomBytes = new byte[SHARE_TOKEN_BYTES];
            secureRandom.nextBytes(randomBytes);
            rawToken = Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(randomBytes);
        } while (reportShareLinkRepository.existsByTokenHash(hashToken(rawToken)));

        return rawToken;
    }

    private String hashToken(String rawToken) {
        try {
            byte[] digest = MessageDigest
                    .getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8));

            return Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private String buildShareUrl(String rawToken) {
        return shareBaseUrl.replaceAll("/+$", "")
                + "/shared/reports/"
                + rawToken;
    }

    private WorkEntry requireAccessibleWorkEntry(
            User currentUser,
            Long workEntryId
    ) {
        if (workEntryId == null) {
            throw new IllegalArgumentException("Work entry id is required");
        }

        WorkEntry workEntry = workEntryRepository
                .findById(workEntryId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Work entry not found"
                ));

        organizationService.requireActiveOrganizationMember(
                currentUser,
                workEntry.getOrganization().getId()
        );

        return workEntry;
    }

    private Report createReport(
            User currentUser,
            WorkEntry workEntry
    ) {
        requireProofReady(workEntry);

        LocalDateTime generatedAt = LocalDateTime.now();
        String reportNumber = buildReportNumber(workEntry, generatedAt);
        String snapshotJson = buildSnapshotJson(
                workEntry,
                reportNumber,
                generatedAt
        );

        Report report = Report.builder()
                .workEntry(workEntry)
                .reportNumber(reportNumber)
                .status(ReportStatus.GENERATED)
                .snapshotJson(snapshotJson)
                .generatedAt(generatedAt)
                .createdBy(currentUser)
                .build();

        return reportRepository.save(report);
    }

    private boolean reportSnapshotContainsPhoto(
            Report report,
            Long photoId
    ) {
        String snapshotJson = report.getSnapshotJson();

        if (snapshotJson == null || photoId == null) {
            return false;
        }

        String photosToken = "\"photos\":[";
        int photosStart = snapshotJson.indexOf(photosToken);

        if (photosStart < 0) {
            return false;
        }

        int photosValueStart = photosStart + photosToken.length();
        int photosEnd = snapshotJson.indexOf("]", photosValueStart);

        if (photosEnd < 0) {
            return false;
        }

        String photosJson = snapshotJson.substring(
                photosValueStart,
                photosEnd
        );

        String idToken = "\"id\":" + photoId;

        return photosJson.contains(idToken + ",")
                || photosJson.contains(idToken + "}");
    }

    private void ensurePathStaysInside(
            Path path,
            Path expectedParent
    ) {
        if (!path.normalize().startsWith(expectedParent.normalize())) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Invalid photo storage path"
            );
        }
    }

    private void requireProofReady(WorkEntry workEntry) {
        long beforePhotoCount = photoRepository.countByWorkEntryAndCategory(
                workEntry,
                PhotoCategory.BEFORE
        );
        long afterPhotoCount = photoRepository.countByWorkEntryAndCategory(
                workEntry,
                PhotoCategory.AFTER
        );

        if (beforePhotoCount == 0 || afterPhotoCount == 0) {
            throw new IllegalArgumentException(
                    "A report requires at least one BEFORE photo and one AFTER photo"
            );
        }

        if (!hasMeaningfulWorkSummary(workEntry.getDescription())) {
            throw new IllegalArgumentException(
                    "Add a work performed summary before generating a report"
            );
        }

        if (workEntry.getStatus() != WorkEntryStatus.COMPLETED) {
            throw new IllegalArgumentException(
                    "Mark the work entry completed before generating a report"
            );
        }
    }

    private boolean hasMeaningfulWorkSummary(String description) {
        if (description == null) {
            return false;
        }

        String normalizedDescription = description.trim();

        if (normalizedDescription.isEmpty()) {
            return false;
        }

        return !normalizedDescription.matches("(?i)^(.)\\1{4,}$");
    }

    private String buildReportNumber(
            WorkEntry workEntry,
            LocalDateTime generatedAt
    ) {
        return String.format(
                "FP-%d-%06d",
                generatedAt.getYear(),
                workEntry.getId()
        );
    }

    private String buildSnapshotJson(
            WorkEntry workEntry,
            String reportNumber,
            LocalDateTime generatedAt
    ) {
        List<WorkEntryPhoto> photos =
                photoRepository.findByWorkEntryOrderByCreatedAtAscIdAsc(workEntry);
        Organization organization = workEntry.getOrganization();

        StringBuilder json = new StringBuilder();
        json.append("{");
        appendJsonStringField(json, "reportNumber", reportNumber);
        json.append(",");
        appendJsonStringField(json, "generatedAt", generatedAt.toString());
        json.append(",");
        json.append("\"organization\":{");
        appendJsonNumberField(json, "id", organization.getId());
        json.append(",");
        appendJsonStringField(json, "name", organization.getName());
        json.append("},");
        json.append("\"workEntry\":{");
        appendJsonNumberField(json, "id", workEntry.getId());
        json.append(",");
        appendJsonStringField(json, "jobName", workEntry.getJobName());
        json.append(",");
        appendJsonStringField(json, "jobAddress", workEntry.getJobAddress());
        json.append(",");
        appendJsonStringField(json, "customerName", workEntry.getCustomerName());
        json.append(",");
        appendJsonStringField(json, "customerPhone", workEntry.getCustomerPhone());
        json.append(",");
        appendJsonStringField(json, "customerEmail", workEntry.getCustomerEmail());
        json.append(",");
        appendJsonStringField(json, "customerContactName", workEntry.getCustomerContactName());
        json.append(",");
        appendJsonStringField(json, "workType", workEntry.getWorkType());
        json.append(",");
        appendJsonStringField(json, "description", workEntry.getDescription());
        json.append(",");
        appendJsonStringField(
                json,
                "workDate",
                workEntry.getWorkDate() == null ? "" : workEntry.getWorkDate().toString()
        );
        json.append(",");
        appendJsonStringField(
                json,
                "scheduledStartTime",
                workEntry.getScheduledStartTime() == null
                        ? ""
                        : workEntry.getScheduledStartTime().toString()
        );
        json.append(",");
        appendJsonStringField(json, "arrivalWindow", workEntry.getArrivalWindow());
        json.append(",");
        appendJsonStringField(json, "estimatedDuration", workEntry.getEstimatedDuration());
        json.append(",");
        appendJsonStringField(json, "status", workEntry.getStatus().name());
        json.append("},");
        json.append("\"photos\":[");

        for (int index = 0; index < photos.size(); index++) {
            if (index > 0) {
                json.append(",");
            }

            appendPhotoSnapshot(json, photos.get(index));
        }

        json.append("]");
        json.append("}");

        return json.toString();
    }

    private void appendPhotoSnapshot(
            StringBuilder json,
            WorkEntryPhoto photo
    ) {
        json.append("{");
        appendJsonNumberField(json, "id", photo.getId());
        json.append(",");
        appendJsonStringField(json, "category", photo.getCategory().name());
        json.append(",");
        appendJsonStringField(json, "originalFilename", photo.getOriginalFilename());
        json.append(",");
        appendJsonStringField(json, "caption", photo.getCaption());
        json.append(",");
        appendJsonStringField(json, "contentType", photo.getContentType());
        json.append(",");
        appendJsonNumberField(json, "fileSizeBytes", photo.getFileSizeBytes());
        json.append(",");
        appendJsonStringField(json, "createdAt", photo.getCreatedAt().toString());
        json.append("}");
    }

    private void appendJsonStringField(
            StringBuilder json,
            String fieldName,
            String value
    ) {
        appendJsonFieldName(json, fieldName);

        if (value == null) {
            json.append("null");
            return;
        }

        json.append("\"")
                .append(escapeJson(value))
                .append("\"");
    }

    private void appendJsonNumberField(
            StringBuilder json,
            String fieldName,
            Number value
    ) {
        appendJsonFieldName(json, fieldName);

        if (value == null) {
            json.append("null");
            return;
        }

        json.append(value);
    }

    private void appendJsonFieldName(
            StringBuilder json,
            String fieldName
    ) {
        json.append("\"")
                .append(escapeJson(fieldName))
                .append("\":");
    }

    private String escapeJson(String value) {
        StringBuilder escaped = new StringBuilder();

        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);

            switch (character) {
                case '"' -> escaped.append("\\\"");
                case '\\' -> escaped.append("\\\\");
                case '\b' -> escaped.append("\\b");
                case '\f' -> escaped.append("\\f");
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                case '\t' -> escaped.append("\\t");
                default -> escaped.append(character);
            }
        }

        return escaped.toString();
    }
}
