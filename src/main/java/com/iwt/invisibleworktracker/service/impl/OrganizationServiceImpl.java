package com.iwt.invisibleworktracker.service.impl;

import com.iwt.invisibleworktracker.entity.MembershipRole;
import com.iwt.invisibleworktracker.entity.MembershipStatus;
import com.iwt.invisibleworktracker.entity.Organization;
import com.iwt.invisibleworktracker.entity.OrganizationMembership;
import com.iwt.invisibleworktracker.entity.User;
import com.iwt.invisibleworktracker.repository.OrganizationMembershipRepository;
import com.iwt.invisibleworktracker.repository.OrganizationRepository;
import com.iwt.invisibleworktracker.service.OrganizationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
