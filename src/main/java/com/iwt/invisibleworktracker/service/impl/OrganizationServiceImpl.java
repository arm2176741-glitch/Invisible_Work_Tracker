package com.iwt.invisibleworktracker.service.impl;

import com.iwt.invisibleworktracker.entity.OrganizationMembership;
import com.iwt.invisibleworktracker.entity.User;
import com.iwt.invisibleworktracker.repository.OrganizationMembershipRepository;
import com.iwt.invisibleworktracker.repository.OrganizationRepository;
import com.iwt.invisibleworktracker.service.OrganizationService;
import org.springframework.stereotype.Service;

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
    public OrganizationMembership createOrganization(
            User currentUser,
            String name
    ) {
        return null;
    }

    @Override
    public List<OrganizationMembership> listOrganizations(
            User currentUser
    ) {
        return List.of();
    }
}
