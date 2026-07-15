package com.iwt.invisibleworktracker.repository;

import com.iwt.invisibleworktracker.entity.WorkEntry;
import com.iwt.invisibleworktracker.entity.WorkEntryPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkEntryPhotoRepository extends JpaRepository<WorkEntryPhoto, Long> {

    List<WorkEntryPhoto> findByWorkEntryOrderByCreatedAtAscIdAsc(
            WorkEntry workEntry
    );

    Optional<WorkEntryPhoto> findByIdAndWorkEntry(
            Long id,
            WorkEntry workEntry
    );
}
