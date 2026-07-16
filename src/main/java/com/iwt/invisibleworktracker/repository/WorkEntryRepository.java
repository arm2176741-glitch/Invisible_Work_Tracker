package com.iwt.invisibleworktracker.repository;

import com.iwt.invisibleworktracker.entity.organization.Organization;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkEntryRepository extends JpaRepository<WorkEntry, Long> {

    List<WorkEntry> findByOrganizationOrderByWorkDateDescCreatedAtDesc(
            Organization organization
    );
}
