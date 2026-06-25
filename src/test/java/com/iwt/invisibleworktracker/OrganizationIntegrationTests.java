package com.iwt.invisibleworktracker;

import com.iwt.invisibleworktracker.entity.MembershipRole;
import com.iwt.invisibleworktracker.entity.MembershipStatus;
import com.iwt.invisibleworktracker.entity.Organization;
import com.iwt.invisibleworktracker.entity.OrganizationMembership;
import com.iwt.invisibleworktracker.entity.User;
import com.iwt.invisibleworktracker.repository.OrganizationMembershipRepository;
import com.iwt.invisibleworktracker.repository.OrganizationRepository;
import com.iwt.invisibleworktracker.repository.SessionRepository;
import com.iwt.invisibleworktracker.repository.UserRepository;
import com.iwt.invisibleworktracker.service.OrganizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class OrganizationIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OrganizationMembershipRepository membershipRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private OrganizationService organizationService;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void cleanDatabase() {
        membershipRepository.deleteAll();
        organizationRepository.deleteAll();
        sessionRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void createOrganizationRejectsUnauthenticatedRequest() throws Exception {
        mockMvc.perform(post("/organizations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("Desert Roofing")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void listOrganizationsRejectsUnauthenticatedRequest() throws Exception {
        mockMvc.perform(get("/organizations"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void createOrganizationCreatesActiveOwnerMembership() throws Exception {
        String token = registerLoginAndGetToken(
                "owner@example.com",
                "Password123!",
                "Owner User"
        );

        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("  Desert Roofing  ")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Desert Roofing"))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.role").value("OWNER"))
                .andExpect(jsonPath("$.membershipStatus").value("ACTIVE"))
                .andExpect(jsonPath("$.createdByUserId").isNumber());

        User user = userRepository.findByEmail("owner@example.com")
                .orElseThrow();

        Organization organization = organizationRepository.findAll().get(0);

        assertThat(organization.getName()).isEqualTo("Desert Roofing");
        assertThat(organization.isActive()).isTrue();
        assertThat(organization.getCreatedBy().getId()).isEqualTo(user.getId());

        OrganizationMembership membership = membershipRepository.findAll().get(0);

        assertThat(membership.getUser().getId()).isEqualTo(user.getId());
        assertThat(membership.getOrganization().getId()).isEqualTo(organization.getId());
        assertThat(membership.getRole()).isEqualTo(MembershipRole.OWNER);
        assertThat(membership.getStatus()).isEqualTo(MembershipStatus.ACTIVE);
    }

    @Test
    void createOrganizationRejectsBlankName() throws Exception {
        String token = registerLoginAndGetToken(
                "blank@example.com",
                "Password123!",
                "Blank User"
        );

        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void createOrganizationRejectsWhitespaceOnlyName() throws Exception {
        String token = registerLoginAndGetToken(
                "spaces@example.com",
                "Password123!",
                "Spaces User"
        );

        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("     ")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void createOrganizationRejectsNameLongerThan150Characters() throws Exception {
        String token = registerLoginAndGetToken(
                "long@example.com",
                "Password123!",
                "Long User"
        );

        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("A".repeat(151))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void createOrganizationAllowsDuplicateNames() throws Exception {
        String token = registerLoginAndGetToken(
                "duplicate@example.com",
                "Password123!",
                "Duplicate User"
        );

        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("Desert Roofing")))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("Desert Roofing")))
                .andExpect(status().isCreated());

        List<Organization> organizations = organizationRepository.findAll();

        assertThat(organizations).hasSize(2);
        assertThat(organizations)
                .extracting(Organization::getName)
                .containsOnly("Desert Roofing");
        assertThat(organizations)
                .extracting(Organization::getId)
                .doesNotHaveDuplicates();
        assertThat(membershipRepository.findAll()).hasSize(2);
    }

    @Test
    void listOrganizationsReturnsEmptyArrayWhenUserHasNoOrganizations() throws Exception {
        String token = registerLoginAndGetToken(
                "empty@example.com",
                "Password123!",
                "Empty User"
        );

        mockMvc.perform(get("/organizations")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void listOrganizationsReturnsCurrentUsersOrganizations() throws Exception {
        String token = registerLoginAndGetToken(
                "list@example.com",
                "Password123!",
                "List User"
        );

        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("First Roofing")))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("Second Roofing")))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/organizations")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[*].name", containsInAnyOrder("First Roofing", "Second Roofing")))
                .andExpect(jsonPath("$[*].role", containsInAnyOrder("OWNER", "OWNER")))
                .andExpect(jsonPath("$[*].membershipStatus", containsInAnyOrder("ACTIVE", "ACTIVE")));
    }

    @Test
    void listOrganizationsOnlyReturnsOrganizationsForCurrentUser() throws Exception {
        String tokenA = registerLoginAndGetToken(
                "user-a@example.com",
                "Password123!",
                "User A"
        );

        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("A Roofing")))
                .andExpect(status().isCreated());

        String tokenB = registerLoginAndGetToken(
                "user-b@example.com",
                "Password123!",
                "User B"
        );

        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("B Roofing")))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/organizations")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("A Roofing"));
    }

    @Test
    void listOrganizationsExcludesInactiveMemberships() throws Exception {
        String token = registerLoginAndGetToken(
                "inactive@example.com",
                "Password123!",
                "Inactive User"
        );

        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("Inactive Roofing")))
                .andExpect(status().isCreated());

        OrganizationMembership membership = membershipRepository.findAll().get(0);
        membership.setStatus(MembershipStatus.REMOVED);
        membershipRepository.save(membership);

        mockMvc.perform(get("/organizations")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void requireActiveOrganizationMemberReturnsOrganizationForActiveMember() throws Exception {
        String token = registerLoginAndGetToken(
                "access@example.com",
                "Password123!",
                "Access User"
        );

        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("Access Roofing")))
                .andExpect(status().isCreated());

        User user = userRepository.findByEmail("access@example.com")
                .orElseThrow();

        Organization organization = organizationRepository.findAll().get(0);

        Organization allowedOrganization =
                organizationService.requireActiveOrganizationMember(
                        user,
                        organization.getId()
                );

        assertThat(allowedOrganization.getId()).isEqualTo(organization.getId());
        assertThat(allowedOrganization.getName()).isEqualTo("Access Roofing");
    }

    @Test
    void requireActiveOrganizationMemberRejectsUnknownOrganization() throws Exception {
        registerLoginAndGetToken(
                "missing-org@example.com",
                "Password123!",
                "Missing Org User"
        );

        User user = userRepository.findByEmail("missing-org@example.com")
                .orElseThrow();

        assertThatThrownBy(() -> organizationService.requireActiveOrganizationMember(user, 999L))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode().value()).isEqualTo(HttpStatus.NOT_FOUND.value());
                    assertThat(exception.getReason()).isEqualTo("Organization not found");
                });
    }

    @Test
    void requireActiveOrganizationMemberRejectsInactiveOrganization() throws Exception {
        String token = registerLoginAndGetToken(
                "inactive-org-access@example.com",
                "Password123!",
                "Inactive Org Access User"
        );

        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("Inactive Org Roofing")))
                .andExpect(status().isCreated());

        User user = userRepository.findByEmail("inactive-org-access@example.com")
                .orElseThrow();

        Organization organization = organizationRepository.findAll().get(0);
        organization.setActive(false);
        organizationRepository.save(organization);

        assertThatThrownBy(
                () -> organizationService.requireActiveOrganizationMember(
                        user,
                        organization.getId()
                ))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode().value()).isEqualTo(HttpStatus.NOT_FOUND.value());
                    assertThat(exception.getReason()).isEqualTo("Organization not found");
                });
    }

    @Test
    void requireActiveOrganizationMemberRejectsUserWithoutMembership() throws Exception {
        String ownerToken = registerLoginAndGetToken(
                "owner-access@example.com",
                "Password123!",
                "Owner Access User"
        );

        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("Owner Roofing")))
                .andExpect(status().isCreated());

        registerLoginAndGetToken(
                "outsider@example.com",
                "Password123!",
                "Outsider User"
        );

        User outsider = userRepository.findByEmail("outsider@example.com")
                .orElseThrow();

        Organization organization = organizationRepository.findAll().get(0);

        assertThatThrownBy(
                () -> organizationService.requireActiveOrganizationMember(
                        outsider,
                        organization.getId()
                ))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode().value()).isEqualTo(HttpStatus.FORBIDDEN.value());
                    assertThat(exception.getReason()).isEqualTo("You do not have access to this organization");
                });
    }

    @Test
    void requireActiveOrganizationMemberRejectsInactiveMembership() throws Exception {
        String token = registerLoginAndGetToken(
                "removed-access@example.com",
                "Password123!",
                "Removed Access User"
        );

        mockMvc.perform(post("/organizations")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(organizationJson("Removed Roofing")))
                .andExpect(status().isCreated());

        User user = userRepository.findByEmail("removed-access@example.com")
                .orElseThrow();

        Organization organization = organizationRepository.findAll().get(0);
        OrganizationMembership membership = membershipRepository.findAll().get(0);
        membership.setStatus(MembershipStatus.REMOVED);
        membershipRepository.save(membership);

        assertThatThrownBy(
                () -> organizationService.requireActiveOrganizationMember(
                        user,
                        organization.getId()
                ))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode().value()).isEqualTo(HttpStatus.FORBIDDEN.value());
                    assertThat(exception.getReason()).isEqualTo("You do not have access to this organization");
                });
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
