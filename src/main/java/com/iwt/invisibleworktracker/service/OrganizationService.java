package com.iwt.invisibleworktracker.service;

import com.iwt.invisibleworktracker.entity.OrganizationMembership;
import com.iwt.invisibleworktracker.entity.User;

import java.util.List;

public interface OrganizationService {
    OrganizationMembership createOrganization(
            User currentUser,
            String name
    );

    List<OrganizationMembership> listOrganizations(
            User currentUser
    );

}
