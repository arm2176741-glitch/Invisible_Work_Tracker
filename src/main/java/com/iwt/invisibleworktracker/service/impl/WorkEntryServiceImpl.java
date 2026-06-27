package com.iwt.invisibleworktracker.service.impl;

import com.iwt.invisibleworktracker.dto.workentry.CreateWorkEntryRequest;
import com.iwt.invisibleworktracker.dto.workentry.WorkEntryResponse;
import com.iwt.invisibleworktracker.entity.Organization;
import com.iwt.invisibleworktracker.entity.User;
import com.iwt.invisibleworktracker.entity.WorkEntry;
import com.iwt.invisibleworktracker.entity.WorkEntryStatus;
import com.iwt.invisibleworktracker.repository.WorkEntryRepository;
import com.iwt.invisibleworktracker.service.OrganizationService;
import com.iwt.invisibleworktracker.service.WorkEntryService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class WorkEntryServiceImpl implements WorkEntryService {

    private final WorkEntryRepository workEntryRepository;
    private final OrganizationService organizationService;

    public WorkEntryServiceImpl(
            WorkEntryRepository workEntryRepository,
            OrganizationService organizationService
    ) {
        this.workEntryRepository = workEntryRepository;
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

        WorkEntry workEntry = WorkEntry.builder()
                .organization(organization)
                .user(currentUser)
                .jobName(normalizeText(request.getJobName(), "Job name", 150))
                .jobAddress(normalizeText(request.getJobAddress(), "Job address", 255))
                .workType(normalizeText(request.getWorkType(), "Work type", 100))
                .description(normalizeText(request.getDescription(), "Description", 2000))
                .workDate(requireWorkDate(request.getWorkDate()))
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
                .map(WorkEntryResponse::from)
                .toList();
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

    private LocalDate requireWorkDate(LocalDate workDate) {
        if (workDate == null) {
            throw new IllegalArgumentException("Work date is required");
        }

        return workDate;
    }
}
