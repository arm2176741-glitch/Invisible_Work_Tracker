package com.iwt.invisibleworktracker;

import com.iwt.invisibleworktracker.entity.organization.Organization;
import com.iwt.invisibleworktracker.entity.user.User;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntry;
import com.iwt.invisibleworktracker.entity.workentry.WorkEntryStatus;
import com.iwt.invisibleworktracker.repository.OrganizationMembershipRepository;
import com.iwt.invisibleworktracker.repository.OrganizationRepository;
import com.iwt.invisibleworktracker.repository.SessionRepository;
import com.iwt.invisibleworktracker.repository.UserRepository;
import com.iwt.invisibleworktracker.repository.WorkEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class WorkEntryIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

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
    void cleanDatabase() {
        workEntryRepository.deleteAll();
        membershipRepository.deleteAll();
        organizationRepository.deleteAll();
        sessionRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void createWorkEntryRejectsUnauthenticatedRequest() throws Exception {
        mockMvc.perform(post("/work-entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workEntryJson(
                                1L,
                                "Smith Roof Repair",
                                "123 Main St",
                                "Leak repair",
                                "Replaced damaged shingles near rear valley.",
                                "2026-06-27"
                        )))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void createWorkEntryCreatesDraftForCurrentUsersOrganization() throws Exception {
        String token = registerLoginAndGetToken(
                "work-owner@example.com",
                "Password123!",
                "Work Owner"
        );

        Organization organization =
                createOrganizationAndGetSaved(token, "Desert Roofing");

        mockMvc.perform(post("/work-entries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workEntryJson(
                                organization.getId(),
                                "  Smith Roof Repair  ",
                                "  123 Main St  ",
                                "  Leak repair  ",
                                "  Replaced damaged shingles near rear valley.  ",
                                "2026-06-27"
                        )))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.organizationId").value(organization.getId()))
                .andExpect(jsonPath("$.userId").isNumber())
                .andExpect(jsonPath("$.jobName").value("Smith Roof Repair"))
                .andExpect(jsonPath("$.jobAddress").value("123 Main St"))
                .andExpect(jsonPath("$.customerName").value("Smith Residence"))
                .andExpect(jsonPath("$.workType").value("Leak repair"))
                .andExpect(jsonPath("$.plannedScope").value("Replaced damaged shingles near rear valley."))
                .andExpect(jsonPath("$.workPerformedSummary").value(""))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.workDate").value("2026-06-27"))
                .andExpect(jsonPath("$.scheduledStartTime").value("08:30:00"))
                .andExpect(jsonPath("$.arrivalWindow").value("8:00-10:00 AM"))
                .andExpect(jsonPath("$.estimatedDuration").value("1 day"))
                .andExpect(jsonPath("$.assignedCrew").value("Armando Arvizu, Alan"))
                .andExpect(jsonPath("$.siteAccessNotes").value("Gate on west side. Homeowner will leave it unlocked."))
                .andExpect(jsonPath("$.internalNotes").value("Do not include gate code in report."))
                .andExpect(jsonPath("$.createdAt").isString())
                .andExpect(jsonPath("$.updatedAt").isString());

        User user = userRepository.findByEmail("work-owner@example.com")
                .orElseThrow();

        WorkEntry workEntry = workEntryRepository.findAll().get(0);

        assertThat(workEntry.getOrganization().getId()).isEqualTo(organization.getId());
        assertThat(workEntry.getUser().getId()).isEqualTo(user.getId());
        assertThat(workEntry.getJobName()).isEqualTo("Smith Roof Repair");
        assertThat(workEntry.getJobAddress()).isEqualTo("123 Main St");
        assertThat(workEntry.getCustomerName()).isEqualTo("Smith Residence");
        assertThat(workEntry.getWorkType()).isEqualTo("Leak repair");
        assertThat(workEntry.getPlannedScope()).isEqualTo("Replaced damaged shingles near rear valley.");
        assertThat(workEntry.getWorkPerformedSummary()).isEmpty();
        assertThat(workEntry.getStatus()).isEqualTo(WorkEntryStatus.DRAFT);
        assertThat(workEntry.getWorkDate().toString()).isEqualTo("2026-06-27");
        assertThat(workEntry.getScheduledStartTime().toString()).isEqualTo("08:30");
        assertThat(workEntry.getArrivalWindow()).isEqualTo("8:00-10:00 AM");
        assertThat(workEntry.getEstimatedDuration()).isEqualTo("1 day");
        assertThat(workEntry.getAssignedCrew()).isEqualTo("Armando Arvizu, Alan");
        assertThat(workEntry.getSiteAccessNotes()).isEqualTo("Gate on west side. Homeowner will leave it unlocked.");
        assertThat(workEntry.getInternalNotes()).isEqualTo("Do not include gate code in report.");
        assertThat(workEntry.getCreatedAt()).isNotNull();
        assertThat(workEntry.getUpdatedAt()).isNotNull();
    }

    @Test
    void createWorkEntryRejectsOtherUsersOrganization() throws Exception {
        String ownerToken = registerLoginAndGetToken(
                "work-access-owner@example.com",
                "Password123!",
                "Work Access Owner"
        );

        Organization ownerOrganization =
                createOrganizationAndGetSaved(ownerToken, "Owner Roofing");

        String outsiderToken = registerLoginAndGetToken(
                "work-access-outsider@example.com",
                "Password123!",
                "Work Access Outsider"
        );

        mockMvc.perform(post("/work-entries")
                        .header("Authorization", "Bearer " + outsiderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workEntryJson(
                                ownerOrganization.getId(),
                                "Blocked Roof Repair",
                                "999 Other St",
                                "Inspection",
                                "This should not be created.",
                                "2026-06-27"
                        )))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        assertThat(workEntryRepository.findAll()).isEmpty();
    }

    @Test
    void createWorkEntryRejectsInvalidRequestBody() throws Exception {
        String token = registerLoginAndGetToken(
                "invalid-work@example.com",
                "Password123!",
                "Invalid Work User"
        );

        Organization organization =
                createOrganizationAndGetSaved(token, "Invalid Work Roofing");

        mockMvc.perform(post("/work-entries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workEntryJson(
                                organization.getId(),
                                "",
                                "123 Main St",
                                "Inspection",
                                "Checked roof condition.",
                                "2026-06-27"
                        )))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        assertThat(workEntryRepository.findAll()).isEmpty();
    }

    @Test
    void listWorkEntriesRejectsUnauthenticatedRequest() throws Exception {
        mockMvc.perform(get("/work-entries")
                        .param("organizationId", "1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void listWorkEntriesReturnsCurrentOrganizationsWorkEntries() throws Exception {
        String token = registerLoginAndGetToken(
                "work-list@example.com",
                "Password123!",
                "Work List User"
        );

        Organization organization =
                createOrganizationAndGetSaved(token, "List Roofing");

        mockMvc.perform(post("/work-entries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workEntryJson(
                                organization.getId(),
                                "Older Roof Repair",
                                "100 First St",
                                "Repair",
                                "Completed older repair.",
                                "2026-06-20"
                        )))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/work-entries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workEntryJson(
                                organization.getId(),
                                "Newer Roof Inspection",
                                "200 Second St",
                                "Inspection",
                                "Completed newer inspection.",
                                "2026-06-27"
                        )))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/work-entries")
                        .header("Authorization", "Bearer " + token)
                        .param("organizationId", organization.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].jobName").value("Newer Roof Inspection"))
                .andExpect(jsonPath("$[0].workDate").value("2026-06-27"))
                .andExpect(jsonPath("$[1].jobName").value("Older Roof Repair"))
                .andExpect(jsonPath("$[1].workDate").value("2026-06-20"));
    }

    @Test
    void listWorkEntriesRejectsOtherUsersOrganization() throws Exception {
        String ownerToken = registerLoginAndGetToken(
                "work-list-owner@example.com",
                "Password123!",
                "Work List Owner"
        );

        Organization ownerOrganization =
                createOrganizationAndGetSaved(ownerToken, "Private Roofing");

        mockMvc.perform(post("/work-entries")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workEntryJson(
                                ownerOrganization.getId(),
                                "Private Roof Repair",
                                "500 Private St",
                                "Repair",
                                "Private work entry.",
                                "2026-06-27"
                        )))
                .andExpect(status().isCreated());

        String outsiderToken = registerLoginAndGetToken(
                "work-list-outsider@example.com",
                "Password123!",
                "Work List Outsider"
        );

        mockMvc.perform(get("/work-entries")
                        .header("Authorization", "Bearer " + outsiderToken)
                        .param("organizationId", ownerOrganization.getId().toString()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void updateWorkEntryStatusMarksAccessibleEntryCompleted() throws Exception {
        String token = registerLoginAndGetToken(
                "work-status@example.com",
                "Password123!",
                "Work Status User"
        );

        Organization organization =
                createOrganizationAndGetSaved(token, "Status Roofing");

        mockMvc.perform(post("/work-entries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workEntryJson(
                                organization.getId(),
                                "Status Roof Repair",
                                "700 Status St",
                                "Repair",
                                "Completed status repair.",
                                "2026-06-27"
                        )))
                .andExpect(status().isCreated());

        WorkEntry workEntry = workEntryRepository.findAll().get(0);

        mockMvc.perform(patch("/work-entries/{workEntryId}/status", workEntry.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusJson("COMPLETED")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(workEntry.getId()))
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        WorkEntry updatedWorkEntry = workEntryRepository.findById(workEntry.getId())
                .orElseThrow();

        assertThat(updatedWorkEntry.getStatus()).isEqualTo(WorkEntryStatus.COMPLETED);
    }

    @Test
    void updateWorkEntryStatusRejectsOtherUsersWorkEntry() throws Exception {
        String ownerToken = registerLoginAndGetToken(
                "work-status-owner@example.com",
                "Password123!",
                "Work Status Owner"
        );

        Organization ownerOrganization =
                createOrganizationAndGetSaved(ownerToken, "Owner Status Roofing");

        mockMvc.perform(post("/work-entries")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workEntryJson(
                                ownerOrganization.getId(),
                                "Private Status Roof",
                                "800 Private Status St",
                                "Repair",
                                "Private status repair.",
                                "2026-06-27"
                        )))
                .andExpect(status().isCreated());

        WorkEntry ownerWorkEntry = workEntryRepository.findAll().get(0);

        String outsiderToken = registerLoginAndGetToken(
                "work-status-outsider@example.com",
                "Password123!",
                "Work Status Outsider"
        );

        mockMvc.perform(patch("/work-entries/{workEntryId}/status", ownerWorkEntry.getId())
                        .header("Authorization", "Bearer " + outsiderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusJson("COMPLETED")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        WorkEntry unchangedWorkEntry = workEntryRepository.findById(ownerWorkEntry.getId())
                .orElseThrow();

        assertThat(unchangedWorkEntry.getStatus()).isEqualTo(WorkEntryStatus.DRAFT);
    }

    @Test
    void updateWorkEntryStatusRejectsUnsupportedUserStatus() throws Exception {
        String token = registerLoginAndGetToken(
                "work-status-invalid@example.com",
                "Password123!",
                "Work Status Invalid"
        );

        Organization organization =
                createOrganizationAndGetSaved(token, "Invalid Status Roofing");

        mockMvc.perform(post("/work-entries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workEntryJson(
                                organization.getId(),
                                "Invalid Status Roof",
                                "900 Invalid Status St",
                                "Repair",
                                "Invalid status repair.",
                                "2026-06-27"
                        )))
                .andExpect(status().isCreated());

        WorkEntry workEntry = workEntryRepository.findAll().get(0);

        mockMvc.perform(patch("/work-entries/{workEntryId}/status", workEntry.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusJson("SUBMITTED")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Status can only be DRAFT or COMPLETED"));

        WorkEntry unchangedWorkEntry = workEntryRepository.findById(workEntry.getId())
                .orElseThrow();

        assertThat(unchangedWorkEntry.getStatus()).isEqualTo(WorkEntryStatus.DRAFT);
    }

    @Test
    void updateWorkEntrySummaryUpdatesAccessibleEntryWorkPerformedSummary() throws Exception {
        String token = registerLoginAndGetToken(
                "work-summary@example.com",
                "Password123!",
                "Work Summary User"
        );

        Organization organization =
                createOrganizationAndGetSaved(token, "Summary Roofing");

        mockMvc.perform(post("/work-entries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workEntryJson(
                                organization.getId(),
                                "Summary Roof Repair",
                                "1200 Summary St",
                                "Repair",
                                "Initial placeholder summary.",
                                "2026-06-27"
                        )))
                .andExpect(status().isCreated());

        WorkEntry workEntry = workEntryRepository.findAll().get(0);

        mockMvc.perform(patch("/work-entries/{workEntryId}/summary", workEntry.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(summaryJson("  Replaced damaged shingles and sealed exposed fasteners.  ")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(workEntry.getId()))
                .andExpect(jsonPath("$.plannedScope")
                        .value("Initial placeholder summary."))
                .andExpect(jsonPath("$.workPerformedSummary")
                        .value("Replaced damaged shingles and sealed exposed fasteners."))
                .andExpect(jsonPath("$.description")
                        .value("Replaced damaged shingles and sealed exposed fasteners."));

        WorkEntry updatedWorkEntry = workEntryRepository.findById(workEntry.getId())
                .orElseThrow();

        assertThat(updatedWorkEntry.getPlannedScope())
                .isEqualTo("Initial placeholder summary.");
        assertThat(updatedWorkEntry.getWorkPerformedSummary())
                .isEqualTo("Replaced damaged shingles and sealed exposed fasteners.");
    }

    @Test
    void updateWorkEntrySummaryRejectsOtherUsersWorkEntry() throws Exception {
        String ownerToken = registerLoginAndGetToken(
                "work-summary-owner@example.com",
                "Password123!",
                "Work Summary Owner"
        );

        Organization ownerOrganization =
                createOrganizationAndGetSaved(ownerToken, "Owner Summary Roofing");

        mockMvc.perform(post("/work-entries")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workEntryJson(
                                ownerOrganization.getId(),
                                "Private Summary Roof",
                                "1300 Private Summary St",
                                "Repair",
                                "Private summary repair.",
                                "2026-06-27"
                        )))
                .andExpect(status().isCreated());

        WorkEntry ownerWorkEntry = workEntryRepository.findAll().get(0);

        String outsiderToken = registerLoginAndGetToken(
                "work-summary-outsider@example.com",
                "Password123!",
                "Work Summary Outsider"
        );

        mockMvc.perform(patch("/work-entries/{workEntryId}/summary", ownerWorkEntry.getId())
                        .header("Authorization", "Bearer " + outsiderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(summaryJson("This should not update the entry.")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        WorkEntry unchangedWorkEntry = workEntryRepository.findById(ownerWorkEntry.getId())
                .orElseThrow();

        assertThat(unchangedWorkEntry.getPlannedScope()).isEqualTo("Private summary repair.");
        assertThat(unchangedWorkEntry.getWorkPerformedSummary()).isEmpty();
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
                  "customerName": "  Smith Residence  ",
                  "workType": "%s",
                  "plannedScope": "%s",
                  "workDate": "%s",
                  "scheduledStartTime": "08:30",
                  "arrivalWindow": "  8:00-10:00 AM  ",
                  "estimatedDuration": "  1 day  ",
                  "assignedCrew": "  Armando Arvizu, Alan  ",
                  "siteAccessNotes": "  Gate on west side. Homeowner will leave it unlocked.  ",
                  "internalNotes": "  Do not include gate code in report.  "
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

    private String statusJson(String status) {
        return """
                {
                  "status": "%s"
                }
                """.formatted(status);
    }

    private String summaryJson(String description) {
        return """
                {
                  "workPerformedSummary": "%s"
                }
                """.formatted(description);
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
