package com.iwt.invisibleworktracker;

import com.iwt.invisibleworktracker.entity.organization.Organization;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntry;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntryPhoto;
import com.iwt.invisibleworktracker.repository.OrganizationMembershipRepository;
import com.iwt.invisibleworktracker.repository.OrganizationRepository;
import com.iwt.invisibleworktracker.repository.SessionRepository;
import com.iwt.invisibleworktracker.repository.UserRepository;
import com.iwt.invisibleworktracker.repository.WorkEntryPhotoRepository;
import com.iwt.invisibleworktracker.repository.WorkEntryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "fieldproof.uploads.work-entry-photos-dir=build/test-uploads/work-entry-photos")
@AutoConfigureMockMvc
class WorkEntryPhotoIntegrationTests {

    private static final Path TEST_UPLOAD_ROOT =
            Path.of("build/test-uploads/work-entry-photos")
                    .toAbsolutePath()
                    .normalize();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WorkEntryPhotoRepository photoRepository;

    @Autowired
    private WorkEntryRepository workEntryRepository;

    @Autowired
    private OrganizationMembershipRepository membershipRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void cleanDatabaseAndUploads() throws IOException {
        cleanDatabase();
        cleanUploadDirectory();
    }

    @AfterEach
    void cleanDatabaseAndUploadsAfterTest() throws IOException {
        cleanDatabase();
        cleanUploadDirectory();
    }

    @Test
    void uploadPhotoRejectsUnauthenticatedRequest() throws Exception {
        MockMultipartFile photo = pngPhoto("before-roof.png");

        mockMvc.perform(multipart("/work-entries/{workEntryId}/photos", 1L)
                        .file(photo)
                        .param("category", "BEFORE"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void uploadPhotoStoresPhotoMetadataForAccessibleWorkEntry() throws Exception {
        String token = registerLoginAndGetToken(
                "photo-owner@example.com",
                "Password123!",
                "Photo Owner"
        );

        Organization organization =
                createOrganizationAndGetSaved(token, "Photo Roofing");

        WorkEntry workEntry =
                createWorkEntryAndGetSaved(
                        token,
                        organization.getId(),
                        "Roof Photo Job"
                );

        mockMvc.perform(multipart("/work-entries/{workEntryId}/photos", workEntry.getId())
                        .file(pngPhoto("before-roof.png"))
                        .param("category", "BEFORE")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.workEntryId").value(workEntry.getId()))
                .andExpect(jsonPath("$.uploadedByUserId").isNumber())
                .andExpect(jsonPath("$.category").value("BEFORE"))
                .andExpect(jsonPath("$.originalFilename").value("before-roof.png"))
                .andExpect(jsonPath("$.contentType").value("image/png"))
                .andExpect(jsonPath("$.fileSizeBytes").value(pngBytes().length))
                .andExpect(jsonPath("$.createdAt").isString());

        WorkEntryPhoto savedPhoto = photoRepository.findAll().get(0);

        assertThat(savedPhoto.getWorkEntry().getId()).isEqualTo(workEntry.getId());
        assertThat(savedPhoto.getOriginalFilename()).isEqualTo("before-roof.png");
        assertThat(savedPhoto.getStoredFilename()).endsWith(".png");
        assertThat(TEST_UPLOAD_ROOT.resolve(savedPhoto.getStoragePath())).exists();
    }

    @Test
    void listPhotosReturnsPhotosForAccessibleWorkEntry() throws Exception {
        String token = registerLoginAndGetToken(
                "photo-list@example.com",
                "Password123!",
                "Photo List User"
        );

        Organization organization =
                createOrganizationAndGetSaved(token, "List Photo Roofing");

        WorkEntry workEntry =
                createWorkEntryAndGetSaved(
                        token,
                        organization.getId(),
                        "List Photo Job"
                );

        uploadPhoto(token, workEntry.getId(), "BEFORE", pngPhoto("before.png"));
        uploadPhoto(token, workEntry.getId(), "AFTER", jpegPhoto("after.jpg"));

        mockMvc.perform(get("/work-entries/{workEntryId}/photos", workEntry.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].category").value("BEFORE"))
                .andExpect(jsonPath("$[0].originalFilename").value("before.png"))
                .andExpect(jsonPath("$[1].category").value("AFTER"))
                .andExpect(jsonPath("$[1].originalFilename").value("after.jpg"));
    }

    @Test
    void uploadPhotoRejectsOtherUsersWorkEntry() throws Exception {
        String ownerToken = registerLoginAndGetToken(
                "photo-access-owner@example.com",
                "Password123!",
                "Photo Access Owner"
        );

        Organization ownerOrganization =
                createOrganizationAndGetSaved(ownerToken, "Owner Photo Roofing");

        WorkEntry ownerWorkEntry =
                createWorkEntryAndGetSaved(
                        ownerToken,
                        ownerOrganization.getId(),
                        "Private Photo Job"
                );

        String outsiderToken = registerLoginAndGetToken(
                "photo-access-outsider@example.com",
                "Password123!",
                "Photo Access Outsider"
        );

        mockMvc.perform(multipart("/work-entries/{workEntryId}/photos", ownerWorkEntry.getId())
                        .file(pngPhoto("blocked.png"))
                        .param("category", "BEFORE")
                        .header("Authorization", "Bearer " + outsiderToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        assertThat(photoRepository.findAll()).isEmpty();
    }

    @Test
    void uploadPhotoRejectsNonImageContentType() throws Exception {
        String token = registerLoginAndGetToken(
                "photo-type@example.com",
                "Password123!",
                "Photo Type User"
        );

        Organization organization =
                createOrganizationAndGetSaved(token, "Type Photo Roofing");

        WorkEntry workEntry =
                createWorkEntryAndGetSaved(
                        token,
                        organization.getId(),
                        "Type Photo Job"
                );

        MockMultipartFile textFile =
                new MockMultipartFile(
                        "file",
                        "notes.txt",
                        "text/plain",
                        "not an image".getBytes()
                );

        mockMvc.perform(multipart("/work-entries/{workEntryId}/photos", workEntry.getId())
                        .file(textFile)
                        .param("category", "BEFORE")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Photo must be a JPEG, PNG, or WebP image"));

        assertThat(photoRepository.findAll()).isEmpty();
    }

    @Test
    void uploadPhotoRejectsImageContentTypeWithFakeFileBody() throws Exception {
        String token = registerLoginAndGetToken(
                "photo-fake@example.com",
                "Password123!",
                "Photo Fake User"
        );

        Organization organization =
                createOrganizationAndGetSaved(token, "Fake Photo Roofing");

        WorkEntry workEntry =
                createWorkEntryAndGetSaved(
                        token,
                        organization.getId(),
                        "Fake Photo Job"
                );

        MockMultipartFile fakeImage =
                new MockMultipartFile(
                        "file",
                        "fake.png",
                        "image/png",
                        "fake image body".getBytes()
                );

        mockMvc.perform(multipart("/work-entries/{workEntryId}/photos", workEntry.getId())
                        .file(fakeImage)
                        .param("category", "BEFORE")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Photo content does not match its file type"));

        assertThat(photoRepository.findAll()).isEmpty();
    }

    @Test
    void uploadPhotoRejectsFileLargerThanTwentyMb() throws Exception {
        String token = registerLoginAndGetToken(
                "photo-large@example.com",
                "Password123!",
                "Photo Large User"
        );

        Organization organization =
                createOrganizationAndGetSaved(token, "Large Photo Roofing");

        WorkEntry workEntry =
                createWorkEntryAndGetSaved(
                        token,
                        organization.getId(),
                        "Large Photo Job"
                );

        MockMultipartFile largePhoto =
                new MockMultipartFile(
                        "file",
                        "large.jpg",
                        "image/jpeg",
                        largeJpegBytes()
                );

        mockMvc.perform(multipart("/work-entries/{workEntryId}/photos", workEntry.getId())
                        .file(largePhoto)
                        .param("category", "BEFORE")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.status").value(413))
                .andExpect(jsonPath("$.message").value("Photo cannot exceed 20MB"));

        assertThat(photoRepository.findAll()).isEmpty();
    }

    @Test
    void deletePhotoRemovesMetadataAndStoredFileForAccessibleWorkEntry() throws Exception {
        String token = registerLoginAndGetToken(
                "photo-delete@example.com",
                "Password123!",
                "Photo Delete User"
        );

        Organization organization =
                createOrganizationAndGetSaved(token, "Delete Photo Roofing");

        WorkEntry workEntry =
                createWorkEntryAndGetSaved(
                        token,
                        organization.getId(),
                        "Delete Photo Job"
                );

        uploadPhoto(token, workEntry.getId(), "BEFORE", pngPhoto("delete-me.png"));

        WorkEntryPhoto savedPhoto = photoRepository.findAll().get(0);
        Path storedFile = TEST_UPLOAD_ROOT.resolve(savedPhoto.getStoragePath());

        assertThat(storedFile).exists();

        mockMvc.perform(delete("/work-entries/{workEntryId}/photos/{photoId}",
                        workEntry.getId(),
                        savedPhoto.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        assertThat(photoRepository.findAll()).isEmpty();
        assertThat(storedFile).doesNotExist();
    }

    private void cleanDatabase() {
        photoRepository.deleteAll();
        workEntryRepository.deleteAll();
        membershipRepository.deleteAll();
        organizationRepository.deleteAll();
        sessionRepository.deleteAll();
        userRepository.deleteAll();
    }

    private void cleanUploadDirectory() throws IOException {
        if (!Files.exists(TEST_UPLOAD_ROOT)) {
            return;
        }

        try (var pathStream = Files.walk(TEST_UPLOAD_ROOT)) {
            pathStream
                    .sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException ex) {
                            throw new IllegalStateException(
                                    "Could not clean test upload path " + path,
                                    ex
                            );
                        }
                    });
        }
    }

    private void uploadPhoto(
            String token,
            Long workEntryId,
            String category,
            MockMultipartFile photo
    ) throws Exception {
        mockMvc.perform(multipart("/work-entries/{workEntryId}/photos", workEntryId)
                        .file(photo)
                        .param("category", category)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated());
    }

    private Organization createOrganizationAndGetSaved(
            String token,
            String name
    ) throws Exception {
        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson(name)))
                .andExpect(status().isCreated());

        return organizationRepository.findAll()
                .stream()
                .filter(organization -> organization.getName().equals(name))
                .findFirst()
                .orElseThrow();
    }

    private WorkEntry createWorkEntryAndGetSaved(
            String token,
            Long organizationId,
            String jobName
    ) throws Exception {
        mockMvc.perform(post("/work-entries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workEntryJson(
                                organizationId,
                                jobName,
                                "100 FieldProof Way",
                                "Roofing",
                                "Documented roof progress.",
                                "2026-07-14"
                        )))
                .andExpect(status().isCreated());

        return workEntryRepository.findAll()
                .stream()
                .filter(workEntry -> workEntry.getJobName().equals(jobName))
                .findFirst()
                .orElseThrow();
    }

    private String registerLoginAndGetToken(
            String email,
            String password,
            String name
    ) throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(email, password, name)))
                .andExpect(status().isCreated());

        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(email, password)))
                .andExpect(status().isOk())
                .andReturn();

        return extractToken(loginResult.getResponse().getContentAsString());
    }

    private MockMultipartFile pngPhoto(String filename) {
        return new MockMultipartFile(
                "file",
                filename,
                "image/png",
                pngBytes()
        );
    }

    private MockMultipartFile jpegPhoto(String filename) {
        return new MockMultipartFile(
                "file",
                filename,
                "image/jpeg",
                jpegBytes()
        );
    }

    private byte[] pngBytes() {
        return new byte[] {
                (byte) 0x89,
                0x50,
                0x4E,
                0x47,
                0x0D,
                0x0A,
                0x1A,
                0x0A,
                0x00
        };
    }

    private byte[] jpegBytes() {
        return new byte[] {
                (byte) 0xFF,
                (byte) 0xD8,
                (byte) 0xFF,
                0x00
        };
    }

    private byte[] largeJpegBytes() {
        byte[] bytes = new byte[(20 * 1024 * 1024) + 1];
        bytes[0] = (byte) 0xFF;
        bytes[1] = (byte) 0xD8;
        bytes[2] = (byte) 0xFF;
        return bytes;
    }

    private String registerJson(String email, String password, String name) {
        return """
                {
                  "email": "%s",
                  "password": "%s",
                  "name": "%s"
                }
                """.formatted(email, password, name);
    }

    private String loginJson(String email, String password) {
        return """
                {
                  "email": "%s",
                  "password": "%s"
                }
                """.formatted(email, password);
    }

    private String organizationJson(String name) {
        return """
                {
                  "name": "%s"
                }
                """.formatted(name);
    }

    private String workEntryJson(
            Long organizationId,
            String jobName,
            String jobAddress,
            String workType,
            String description,
            String workDate
    ) {
        return """
                {
                  "organizationId": %d,
                  "jobName": "%s",
                  "jobAddress": "%s",
                  "workType": "%s",
                  "description": "%s",
                  "workDate": "%s"
                }
                """.formatted(
                organizationId,
                jobName,
                jobAddress,
                workType,
                description,
                workDate
        );
    }

    private String extractToken(String responseBody) {
        Matcher matcher = Pattern
                .compile("\"token\"\\s*:\\s*\"([^\"]+)\"")
                .matcher(responseBody);

        if (!matcher.find()) {
            throw new AssertionError("Login response did not contain a token: " + responseBody);
        }

        return matcher.group(1);
    }
}
