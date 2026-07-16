package com.iwt.invisibleworktracker.repository;

import com.iwt.invisibleworktracker.entity.report.Report;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, Long> {

    Optional<Report> findByWorkEntry(WorkEntry workEntry);

    boolean existsByWorkEntry(WorkEntry workEntry);


}
