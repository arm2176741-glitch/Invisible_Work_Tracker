package com.iwt.invisibleworktracker.controller;

import com.iwt.invisibleworktracker.dto.workentry.CreateWorkEntryRequest;
import com.iwt.invisibleworktracker.dto.workentry.WorkEntryResponse;
import com.iwt.invisibleworktracker.entity.User;
import com.iwt.invisibleworktracker.service.WorkEntryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/work-entries")
public class WorkEntryController {

    private final WorkEntryService workEntryService;

    public WorkEntryController(
            WorkEntryService workEntryService
    ) {
        this.workEntryService = workEntryService;
    }

    @PostMapping
    public ResponseEntity<WorkEntryResponse> createWorkEntry(
            @Valid @RequestBody CreateWorkEntryRequest request,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();

        WorkEntryResponse workEntry =
                workEntryService.createWorkEntry(
                        currentUser,
                        request
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(workEntry);
    }

    @GetMapping
    public ResponseEntity<List<WorkEntryResponse>> listWorkEntries(
            @RequestParam Long organizationId,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();

        List<WorkEntryResponse> workEntries =
                workEntryService.listWorkEntries(
                        currentUser,
                        organizationId
                );

        return ResponseEntity.ok(workEntries);
    }
}
