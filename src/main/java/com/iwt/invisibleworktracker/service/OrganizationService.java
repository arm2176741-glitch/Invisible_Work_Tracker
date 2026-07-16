package com.iwt.invisibleworktracker.service;

import com.iwt.invisibleworktracker.entity.organization.Organization;
import com.iwt.invisibleworktracker.entity.organization.OrganizationMembership;
import com.iwt.invisibleworktracker.entity.user.User;

import java.util.List;

public interface OrganizationService {
    OrganizationMembership createOrganization(
            User currentUser,
            String name
    );

    List<OrganizationMembership> listOrganizations(
            User currentUser
    );

    Organization requireActiveOrganizationMember(
            User currentUser,
            Long organizationId
    );

}
