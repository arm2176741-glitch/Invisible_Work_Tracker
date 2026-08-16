package com.iwt.invisibleworktracker.controller;

import com.iwt.invisibleworktracker.dto.workentry.WorkEntryPhotoContent;
import com.iwt.invisibleworktracker.dto.workentry.WorkEntryPhotoResponse;
import com.iwt.invisibleworktracker.entity.user.User;
import com.iwt.invisibleworktracker.service.WorkEntryPhotoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/work-entries/{workEntryId}/photos")
public class WorkEntryPhotoController {

    private final WorkEntryPhotoService workEntryPhotoService;

    public WorkEntryPhotoController(
            WorkEntryPhotoService workEntryPhotoService
    ) {
        this.workEntryPhotoService = workEntryPhotoService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<WorkEntryPhotoResponse> uploadPhoto(
            @PathVariable Long workEntryId,
           @RequestParam String category,
            @RequestParam(required = false) String caption,
            @RequestParam MultipartFile file,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();



        WorkEntryPhotoResponse photo =
                workEntryPhotoService.uploadPhoto(
                        currentUser,
                        workEntryId,
                        category,
                        caption,
                        file
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(photo);
    }

    @GetMapping
    public ResponseEntity<List<WorkEntryPhotoResponse>> listPhotos(
            @PathVariable Long workEntryId,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();

        return ResponseEntity.ok(
                workEntryPhotoService.listPhotos(
                        currentUser,
                        workEntryId
                )
        );
    }

    @GetMapping("/{photoId}/content")
    public ResponseEntity<byte[]> getPhotoContent(
            @PathVariable Long workEntryId,
            @PathVariable Long photoId,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();

        WorkEntryPhotoContent content =
                workEntryPhotoService.getPhotoContent(
                        currentUser,
                        workEntryId,
                        photoId
                );

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.contentType()))
                .header("Content-Disposition", "inline")
                .header("Cache-Control", "private, max-age=300")
                .header("X-Content-Type-Options", "nosniff")
                .body(content.bytes());
    }

    @DeleteMapping("/{photoId}")
    public ResponseEntity<Void> deletePhoto(
            @PathVariable Long workEntryId,
            @PathVariable Long photoId,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();

        workEntryPhotoService.deletePhoto(
                currentUser,
                workEntryId,
                photoId
        );

        return ResponseEntity.noContent().build();
    }
}
