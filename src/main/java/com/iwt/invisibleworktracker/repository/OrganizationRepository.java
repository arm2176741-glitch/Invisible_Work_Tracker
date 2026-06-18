package com.iwt.invisibleworktracker.repository;

import com.iwt.invisibleworktracker.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {
    Optional<Organization> findByIdAndActiveTrue(Long id);
}
