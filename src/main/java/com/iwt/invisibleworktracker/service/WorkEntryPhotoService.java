package com.iwt.invisibleworktracker.service;

import com.iwt.invisibleworktracker.dto.workentry.WorkEntryPhotoContent;
import com.iwt.invisibleworktracker.dto.workentry.WorkEntryPhotoResponse;
import com.iwt.invisibleworktracker.entity.user.User;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface WorkEntryPhotoService {

    WorkEntryPhotoResponse uploadPhoto(
            User currentUser,
            Long workEntryId,
            String category,
            String caption,
            MultipartFile file
    );

    List<WorkEntryPhotoResponse> listPhotos(
            User currentUser,
            Long workEntryId
    );

    WorkEntryPhotoContent getPhotoContent(
            User currentUser,
            Long workEntryId,
            Long photoId
    );

    void deletePhoto(
            User currentUser,
            Long workEntryId,
            Long photoId
    );
}
