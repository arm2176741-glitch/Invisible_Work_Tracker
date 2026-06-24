package com.iwt.invisibleworktracker.controller;

import com.iwt.invisibleworktracker.dto.CreateOrganizationRequest;
import com.iwt.invisibleworktracker.dto.OrganizationResponse;
import com.iwt.invisibleworktracker.entity.OrganizationMembership;
import com.iwt.invisibleworktracker.entity.User;
import com.iwt.invisibleworktracker.service.OrganizationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/organizations")
public class OrganizationController {

    private final OrganizationService organizationService;

    public OrganizationController(
            OrganizationService organizationService
    ) {
        this.organizationService = organizationService;
    }

    @PostMapping
    public ResponseEntity<OrganizationResponse> createOrganization(
            @Valid @RequestBody CreateOrganizationRequest request,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();

        OrganizationMembership membership =
                organizationService.createOrganization(
                        currentUser,
                        request.getName()
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(OrganizationResponse.from(membership));
    }

    @GetMapping
    public ResponseEntity<List<OrganizationResponse>> listOrganizations(
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();

        List<OrganizationResponse> organizations =
                organizationService.listOrganizations(currentUser)
                        .stream()
                        .map(OrganizationResponse::from)
                        .toList();
        return ResponseEntity.ok(organizations);
    }
}
