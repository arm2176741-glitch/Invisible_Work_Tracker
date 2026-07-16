package com.iwt.invisibleworktracker.service.impl;

import com.iwt.invisibleworktracker.entity.organization.Organization;
import com.iwt.invisibleworktracker.entity.report.Report;
import com.iwt.invisibleworktracker.entity.report.ReportStatus;
import com.iwt.invisibleworktracker.entity.user.User;
import com.iwt.invisibleworktracker.entity.workentry.PhotoCategory;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntry;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntryPhoto;
import com.iwt.invisibleworktracker.repository.ReportRepository;
import com.iwt.invisibleworktracker.repository.WorkEntryPhotoRepository;
import com.iwt.invisibleworktracker.repository.WorkEntryRepository;
import com.iwt.invisibleworktracker.service.OrganizationService;
import com.iwt.invisibleworktracker.service.ReportService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReportServiceImpl implements ReportService {

    private final ReportRepository reportRepository;
    private final WorkEntryRepository workEntryRepository;
    private final WorkEntryPhotoRepository photoRepository;
    private final OrganizationService organizationService;

    public ReportServiceImpl(
            ReportRepository reportRepository,
            WorkEntryRepository workEntryRepository,
            WorkEntryPhotoRepository photoRepository,
            OrganizationService organizationService
    ) {
        this.reportRepository = reportRepository;
        this.workEntryRepository = workEntryRepository;
        this.photoRepository = photoRepository;
        this.organizationService = organizationService;
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
        appendJsonStringField(json, "workType", workEntry.getWorkType());
        json.append(",");
        appendJsonStringField(json, "description", workEntry.getDescription());
        json.append(",");
        appendJsonStringField(json, "workDate", workEntry.getWorkDate().toString());
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
