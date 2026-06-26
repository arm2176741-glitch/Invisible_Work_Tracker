package com.iwt.invisibleworktracker.service;

import com.iwt.invisibleworktracker.dto.workentry.CreateWorkEntryRequest;
import com.iwt.invisibleworktracker.dto.workentry.WorkEntryResponse;
import com.iwt.invisibleworktracker.entity.User;

import java.util.List;

public interface WorkEntryService {

    WorkEntryResponse createWorkEntry(
            User currentUser,
            CreateWorkEntryRequest request
    );

    List<WorkEntryResponse> listWorkEntries(
            User currentUser,
            Long organizationId
    );
}
