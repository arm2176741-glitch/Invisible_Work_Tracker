package com.iwt.invisibleworktracker.service.impl;

import com.iwt.invisibleworktracker.entity.MembershipRole;
import com.iwt.invisibleworktracker.entity.MembershipStatus;
import com.iwt.invisibleworktracker.entity.Organization;
import com.iwt.invisibleworktracker.entity.OrganizationMembership;
import com.iwt.invisibleworktracker.entity.User;
import com.iwt.invisibleworktracker.repository.OrganizationMembershipRepository;
import com.iwt.invisibleworktracker.repository.OrganizationRepository;
import com.iwt.invisibleworktracker.service.OrganizationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class OrganizationServiceImpl implements OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;

    public OrganizationServiceImpl(
            OrganizationRepository organizationRepository,
            OrganizationMembershipRepository membershipRepository
    ) {
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
    }

    @Override
    @Transactional
    public OrganizationMembership createOrganization(
            User currentUser,
            String name
    ) {
        String normalizedName = normalizeName(name);

        Organization organization = Organization.builder()
                .name(normalizedName)
                .createdBy(currentUser)
                .build();

        Organization savedOrganization =
                organizationRepository.save(organization);

        OrganizationMembership membership =
                OrganizationMembership.builder()
                        .user(currentUser)
                        .organization(savedOrganization)
                        .role(MembershipRole.OWNER)
                        .status(MembershipStatus.ACTIVE)
                        .build();

        return membershipRepository.save(membership);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrganizationMembership> listOrganizations(
            User currentUser
    ) {
        return membershipRepository
                .findByUserAndStatusOrderByCreatedAtAsc(
                        currentUser,
                        MembershipStatus.ACTIVE
                );
    }

    @Override
    @Transactional(readOnly = true)
    public Organization requireActiveOrganizationMember(
            User currentUser,
            Long organizationId
    ) {
        if (currentUser == null) {
            throw new IllegalArgumentException("Current user is required");
        }

        if (organizationId == null) {
            throw new IllegalArgumentException("Organization id is required");
        }

        Organization organization = organizationRepository
                .findByIdAndActiveTrue(organizationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Organization not found"
                ));

        boolean hasActiveMembership =
                membershipRepository.existsByUserAndOrganizationAndStatus(
                        currentUser,
                        organization,
                        MembershipStatus.ACTIVE
                );

        if (!hasActiveMembership) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You do not have access to this organization"
            );
        }

        return organization;
    }

    private String normalizeName(String name) {
        if (name == null) {
            throw new IllegalArgumentException("Organization name is required");
        }

        String normalizedName = name.trim();

        if (normalizedName.isEmpty()) {
            throw new IllegalArgumentException("Organization name is required");
        }

        if (normalizedName.length() > 150) {
            throw new IllegalArgumentException("Organization name cannot exceed 150 characters");
        }

        return normalizedName;
    }
}
