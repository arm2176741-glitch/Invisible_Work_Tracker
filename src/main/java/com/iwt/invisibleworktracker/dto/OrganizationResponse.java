package com.iwt.invisibleworktracker.dto;

import com.iwt.invisibleworktracker.entity.MembershipRole;
import com.iwt.invisibleworktracker.entity.Organization;
import com.iwt.invisibleworktracker.entity.OrganizationMembership;

import java.time.LocalDateTime;

public class OrganizationResponse {

    private Long id;
    private String name;
    private boolean active;
    private Long createdByUserId;
    private MembershipRole role;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static OrganizationResponse from(OrganizationMembership membership) {
        Organization organization = membership.getOrganization();

        OrganizationResponse response = new OrganizationResponse();
        response.id = organization.getId();
        response.name = organization.getName();
        response.active = organization.isActive();
        response.createdByUserId = organization.getCreatedBy().getId();
        response.role = membership.getRole();
        response.createdAt = organization.getCreatedAt();
        response.updatedAt = organization.getUpdatedAt();
        return response;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public boolean isActive() {
        return active;
    }

    public Long getCreatedByUserId() {
        return createdByUserId;
    }

    public MembershipRole getRole() {
        return role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
