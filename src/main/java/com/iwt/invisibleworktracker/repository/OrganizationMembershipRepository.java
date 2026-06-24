package com.iwt.invisibleworktracker.repository;

import com.iwt.invisibleworktracker.entity.MembershipStatus;
import com.iwt.invisibleworktracker.entity.Organization;
import com.iwt.invisibleworktracker.entity.OrganizationMembership;
import com.iwt.invisibleworktracker.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;
import java.util.Optional;

public interface OrganizationMembershipRepository extends JpaRepository<OrganizationMembership, Long> {
    Optional<OrganizationMembership> findByUserAndOrganization(User user, Organization organization);

    @EntityGraph(attributePaths = {
            "organization",
            "organization.createdBy"
    })
    List<OrganizationMembership> findByUserAndStatusOrderByCreatedAtAsc(
            User user, MembershipStatus status
    );

    boolean existsByUserAndOrganizationAndStatus(
            User user,
            Organization organization,
            MembershipStatus status
    );
}
