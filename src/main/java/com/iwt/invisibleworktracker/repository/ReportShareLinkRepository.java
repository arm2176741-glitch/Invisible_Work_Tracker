package com.iwt.invisibleworktracker.repository;

import com.iwt.invisibleworktracker.entity.report.Report;
import com.iwt.invisibleworktracker.entity.report.ReportShareLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface ReportShareLinkRepository extends JpaRepository<ReportShareLink, Long> {

    Optional<ReportShareLink> findByTokenHashAndRevokedAtIsNull(String tokenHash);

    Optional<ReportShareLink> findByIdAndReport(Long id, Report report);

    boolean existsByTokenHash(String tokenHash);

    boolean existsByReportAndRevokedAtIsNullAndExpiresAtAfter(
            Report report,
            LocalDateTime expiresAt
    );
}
