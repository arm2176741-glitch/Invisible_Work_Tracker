package com.iwt.invisibleworktracker.service.impl;

import com.iwt.invisibleworktracker.dto.workentry.CreateWorkEntryRequest;
import com.iwt.invisibleworktracker.dto.workentry.UpdateWorkEntrySummaryRequest;
import com.iwt.invisibleworktracker.dto.workentry.UpdateWorkEntryStatusRequest;
import com.iwt.invisibleworktracker.dto.workentry.WorkEntryResponse;
import com.iwt.invisibleworktracker.entity.organization.Organization;
import com.iwt.invisibleworktracker.entity.user.User;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntry;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntryStatus;
import com.iwt.invisibleworktracker.repository.ReportRepository;
import com.iwt.invisibleworktracker.repository.WorkEntryRepository;
import com.iwt.invisibleworktracker.service.OrganizationService;
import com.iwt.invisibleworktracker.service.WorkEntryService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
public class WorkEntryServiceImpl implements WorkEntryService {

    private final WorkEntryRepository workEntryRepository;
    private final ReportRepository reportRepository;
    private final OrganizationService organizationService;
    private static final Set<WorkEntryStatus> USER_SELECTABLE_STATUSES =
            EnumSet.of(
                    WorkEntryStatus.DRAFT,
                    WorkEntryStatus.COMPLETED,
                    WorkEntryStatus.ARCHIVED
            );

    public WorkEntryServiceImpl(
            WorkEntryRepository workEntryRepository,
            ReportRepository reportRepository,
            OrganizationService organizationService
    ) {
        this.workEntryRepository = workEntryRepository;
        this.reportRepository = reportRepository;
        this.organizationService = organizationService;
    }

    @Override
    @Transactional
    public WorkEntryResponse createWorkEntry(
            User currentUser,
            CreateWorkEntryRequest request
    ) {
        if (request == null) {
            throw new IllegalArgumentException("Work entry request is required");
        }

        Organization organization =
                organizationService.requireActiveOrganizationMember(
                        currentUser,
                        request.getOrganizationId()
                );

        String plannedScope = firstPresent(
                request.getPlannedScope(),
                request.getDescription()
        );

        WorkEntry workEntry = WorkEntry.builder()
                .organization(organization)
                .user(currentUser)
                .jobName(normalizeText(request.getJobName(), "Job name", 150))
                .jobAddress(normalizeText(request.getJobAddress(), "Job address", 255))
                .customerName(normalizeText(request.getCustomerName(), "Customer name", 150))
                .customerPhone(normalizeOptionalText(request.getCustomerPhone(), "Customer phone", 40))
                .customerEmail(normalizeOptionalText(request.getCustomerEmail(), "Customer email", 150))
                .customerContactName(normalizeOptionalText(
                        request.getCustomerContactName(),
                        "Customer contact person",
                        150
                ))
                .workType(normalizeText(request.getWorkType(), "Work type", 100))
                .plannedScope(normalizeOptionalText(plannedScope, "Planned scope", 2000))
                .workPerformedSummary("")
                .workDate(request.getWorkDate())
                .scheduledStartTime(request.getScheduledStartTime())
                .arrivalWindow(normalizeOptionalText(request.getArrivalWindow(), "Arrival window", 100))
                .estimatedDuration(normalizeOptionalText(
                        request.getEstimatedDuration(),
                        "Estimated duration",
                        80
                ))
                .assignedCrew(normalizeOptionalText(request.getAssignedCrew(), "Assigned crew", 500))
                .siteAccessNotes(normalizeOptionalText(request.getSiteAccessNotes(), "Site access notes", 1000))
                .internalNotes(normalizeOptionalText(request.getInternalNotes(), "Internal notes", 1000))
                .status(WorkEntryStatus.DRAFT)
                .build();

        WorkEntry savedWorkEntry = workEntryRepository.save(workEntry);

        return WorkEntryResponse.from(savedWorkEntry);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkEntryResponse> listWorkEntries(
            User currentUser,
            Long organizationId
    ) {
        Organization organization =
                organizationService.requireActiveOrganizationMember(
                        currentUser,
                        organizationId
                );

        return workEntryRepository
                .findByOrganizationOrderByWorkDateDescCreatedAtDesc(organization)
                .stream()
                .map(workEntry -> WorkEntryResponse.from(
                        workEntry,
                        reportRepository.findByWorkEntry(workEntry).orElse(null)
                ))
                .toList();
    }

    @Override
    @Transactional
    public WorkEntryResponse updateWorkEntryStatus(
            User currentUser,
            Long workEntryId,
            UpdateWorkEntryStatusRequest request
    ) {
        if (request == null) {
            throw new IllegalArgumentException("Status request is required");
        }

        if (request.getStatus() == null) {
            throw new IllegalArgumentException("Status is required");
        }

        if (!USER_SELECTABLE_STATUSES.contains(request.getStatus())) {
            throw new IllegalArgumentException("Status can only be DRAFT, COMPLETED, or ARCHIVED");
        }

        WorkEntry workEntry = requireAccessibleWorkEntry(currentUser, workEntryId);
        workEntry.setStatus(request.getStatus());

        WorkEntry savedWorkEntry = workEntryRepository.save(workEntry);

        return WorkEntryResponse.from(
                savedWorkEntry,
                reportRepository.findByWorkEntry(savedWorkEntry).orElse(null)
        );
    }

    @Override
    @Transactional
    public WorkEntryResponse updateWorkEntrySummary(
            User currentUser,
            Long workEntryId,
            UpdateWorkEntrySummaryRequest request
    ) {
        if (request == null) {
            throw new IllegalArgumentException("Work performed summary request is required");
        }

        WorkEntry workEntry = requireAccessibleWorkEntry(currentUser, workEntryId);
        String workPerformedSummary = firstPresent(
                request.getWorkPerformedSummary(),
                request.getDescription()
        );

        workEntry.setWorkPerformedSummary(
                normalizeText(workPerformedSummary, "Work performed summary", 2000)
        );

        WorkEntry savedWorkEntry = workEntryRepository.save(workEntry);

        return WorkEntryResponse.from(
                savedWorkEntry,
                reportRepository.findByWorkEntry(savedWorkEntry).orElse(null)
        );
    }

    private String normalizeText(
            String value,
            String fieldName,
            int maxLength
    ) {
        if (value == null) {
            throw new IllegalArgumentException(fieldName + " is required");
        }

        String normalizedValue = value.trim();

        if (normalizedValue.isEmpty()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }

        if (normalizedValue.length() > maxLength) {
            throw new IllegalArgumentException(
                    fieldName + " cannot exceed " + maxLength + " characters"
            );
        }

        return normalizedValue;
    }

    private String firstPresent(
            String preferredValue,
            String fallbackValue
    ) {
        if (preferredValue != null) {
            return preferredValue;
        }

        return fallbackValue;
    }

    private String normalizeOptionalText(
            String value,
            String fieldName,
            int maxLength
    ) {
        if (value == null) {
            return "";
        }

        String normalizedValue = value.trim();

        if (normalizedValue.length() > maxLength) {
            throw new IllegalArgumentException(
                    fieldName + " cannot exceed " + maxLength + " characters"
            );
        }

        return normalizedValue;
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
}
