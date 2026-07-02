package com.iwt.invisibleworktracker;
import com.iwt.invisibleworktracker.entity.Session;
import com.iwt.invisibleworktracker.entity.User;
import java.time.LocalDateTime;
import static org.assertj.core.api.Assertions.assertThat;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OrganizationMembershipRepository membershipRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private WorkEntryRepository workEntryRepository;

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
    void authFlowRegistersLogsInReadsCurrentUserAndLogsOut() throws Exception {
        String registerJson = """
                {
                  "email": "test@example.com",
                  "password": "Password123!",
                  "name": "Test User"
                }
                """;

        String loginJson = """
                {
                  "email": "test@example.com",
                  "password": "Password123!"
                }
                """;

        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Unauthorized"));

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Account created successfully"));

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Login successful"))
                .andExpect(jsonPath("$.token").isString())
                .andReturn();

        String token = extractToken(loginResult.getResponse().getContentAsString());

        mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.name").value("Test User"))
                .andExpect(jsonPath("$.role").value("USER"));

        mockMvc.perform(post("/auth/logout")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void registerRejectsInvalidRequestBody() throws Exception {
        String invalidRegisterJson = """
                {
                  "email": "not-an-email",
                  "password": "short",
                  "name": ""
                }
                """;

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRegisterJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void registerRejectsPasswordLongerThan72Characters() throws Exception {
        String longPassword = "A".repeat(73);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson("long-register@example.com", longPassword, "Long Password User")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void registerRejectsDuplicateEmailIgnoringCase() throws Exception {
        registerUser("Case@Test.com", "Password123!", "Case User");

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson("case@test.com", "Password123!", "Duplicate Case User")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void loginRejectsUnknownEmail() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("missing@example.com", "Password123!")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void loginRejectsPasswordLongerThan72Characters() throws Exception {
        String longPassword = "A".repeat(73);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("long-login@example.com", longPassword)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void loginRejectsWrongPassword() throws Exception {
        registerUser("wrong-password@example.com", "Password123!", "Wrong Password User");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("wrong-password@example.com", "BadPassword123!")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }


    @Test
    void loginCreatesSessionThatExpiresAboutThirtyDaysLater() throws Exception {
        registerUser("session-days@example.com", "Password123!", "Session User");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("session-days@example.com", "Password123!")))
                .andExpect(status().isOk());

        User user = userRepository.findByEmail("session-days@example.com")
                .orElseThrow();

        Session session = sessionRepository.findByUserAndValidTrue(user)
                .orElseThrow();

        LocalDateTime now = LocalDateTime.now();

        assertThat(session.getExpiresAt()).isAfter(now.plusDays(29));
        assertThat(session.getExpiresAt()).isBefore(now.plusDays(31));
    }

    @Test
    void protectedEndpointRejectsInvalidBearerToken() throws Exception {
        mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void logoutRejectsMissingBearerToken() throws Exception {
        mockMvc.perform(post("/auth/logout"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginLocksAccountAfterTooManyFailedAttempts() throws Exception {
        registerUser("locked@example.com", "Password123!", "Locked User");

        for (int attempt = 0; attempt < 5; attempt++) {
            mockMvc.perform(post("/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginJson("locked@example.com", "WrongPassword123!")))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401));
        }

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("locked@example.com", "Password123!")))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429));
    }

    @Test
    void currentUserDoesNotExposePasswordHash() throws Exception {
        registerUser("safe-user@example.com", "Password123!", "Safe User");

        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("safe-user@example.com", "Password123!")))
                .andExpect(status().isOk())
                .andReturn();

        String token = extractToken(loginResult.getResponse().getContentAsString());

        mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("safe-user@example.com"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void registerStoresPasswordAsHashNotPlainText() throws Exception {
        registerUser("hashed-password@example.com", "Password123!", "Hashed Password User");

        User user = userRepository.findByEmail("hashed-password@example.com")
                .orElseThrow();

        assertThat(user.getPasswordHash()).isNotEqualTo("Password123!");
        assertThat(user.getPasswordHash()).startsWith("$2");
    }

    @Test
    void loginAcceptsEmailCaseInsensitive() throws Exception {
        registerUser("case-login@example.com", "Password123!", "Case Login User");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("CASE-LOGIN@EXAMPLE.COM", "Password123!")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Login successful"))
                .andExpect(jsonPath("$.token").isString());
    }

    @Test
    void registerStoresEmailLowercase() throws Exception {
        registerUser("StoredCase@Example.COM", "Password123!", "Stored Case User");

        assertThat(userRepository.findByEmail("storedcase@example.com")).isPresent();
        assertThat(userRepository.findByEmail("StoredCase@Example.COM")).isEmpty();
    }

    @Test
    void loginStoresHashedSessionTokenOnly() throws Exception {
        registerUser("token-storage@example.com", "Password123!", "Token Storage User");

        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("token-storage@example.com", "Password123!")))
                .andExpect(status().isOk())
                .andReturn();

        String rawToken = extractToken(loginResult.getResponse().getContentAsString());

        User user = userRepository.findByEmail("token-storage@example.com")
                .orElseThrow();

        Session session = sessionRepository.findByUserAndValidTrue(user)
                .orElseThrow();

        assertThat(session.getToken()).isNotEqualTo(rawToken);
        assertThat(session.getToken()).hasSizeGreaterThan(30);
    }

    @Test
    void expiredSessionIsRejectedAndMarkedInvalid() throws Exception {
        registerUser("expired-session@example.com", "Password123!", "Expired Session User");

        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("expired-session@example.com", "Password123!")))
                .andExpect(status().isOk())
                .andReturn();

        String token = extractToken(loginResult.getResponse().getContentAsString());

        User user = userRepository.findByEmail("expired-session@example.com")
                .orElseThrow();

        Session session = sessionRepository.findByUserAndValidTrue(user)
                .orElseThrow();
        session.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        sessionRepository.save(session);

        mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        Session expiredSession = sessionRepository.findById(session.getId())
                .orElseThrow();

        assertThat(expiredSession.isValid()).isFalse();
    }

    @Test
    void disabledAccountCannotLogin() throws Exception {
        registerUser("disabled@example.com", "Password123!", "Disabled User");

        User user = userRepository.findByEmail("disabled@example.com")
                .orElseThrow();
        user.setActive(false);
        userRepository.save(user);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("disabled@example.com", "Password123!")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void successfulLoginResetsFailedAttemptState() throws Exception {
        registerUser("reset-attempts@example.com", "Password123!", "Reset Attempts User");

        for (int attempt = 0; attempt < 2; attempt++) {
            mockMvc.perform(post("/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginJson("reset-attempts@example.com", "WrongPassword123!")))
                    .andExpect(status().isUnauthorized());
        }

        User userAfterFailures = userRepository.findByEmail("reset-attempts@example.com")
                .orElseThrow();

        assertThat(userAfterFailures.getFailedAttempts()).isEqualTo(2);
        assertThat(userAfterFailures.getLastFailedLogin()).isNotNull();

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("reset-attempts@example.com", "Password123!")))
                .andExpect(status().isOk());

        User userAfterSuccess = userRepository.findByEmail("reset-attempts@example.com")
                .orElseThrow();

        assertThat(userAfterSuccess.getFailedAttempts()).isZero();
        assertThat(userAfterSuccess.getLastFailedLogin()).isNull();
        assertThat(userAfterSuccess.getAccountUnlockedUntil()).isNull();
        assertThat(userAfterSuccess.getLastLogin()).isNotNull();
    }

    @Test
    void loginSucceedsAfterExpiredLockoutWindow() throws Exception {
        registerUser("expired-lockout@example.com", "Password123!", "Expired Lockout User");

        User user = userRepository.findByEmail("expired-lockout@example.com")
                .orElseThrow();
        user.setFailedAttempts(5);
        user.setAccountUnlockedUntil(LocalDateTime.now().minusMinutes(1));
        userRepository.save(user);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("expired-lockout@example.com", "Password123!")))
                .andExpect(status().isOk());

        User refreshedUser = userRepository.findByEmail("expired-lockout@example.com")
                .orElseThrow();

        assertThat(refreshedUser.getFailedAttempts()).isZero();
        assertThat(refreshedUser.getAccountUnlockedUntil()).isNull();
    }

    @Test
    void logoutRejectsUnknownBearerToken() throws Exception {
        mockMvc.perform(post("/auth/logout")
                        .header("Authorization", "Bearer unknown-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void logoutRejectsMalformedAuthorizationHeader() throws Exception {
        mockMvc.perform(post("/auth/logout")
                        .header("Authorization", "Token not-a-bearer-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginRejectsMalformedEmailBeforeCheckingCredentials() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("not-an-email", "Password123!")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void registerRejectsNameLongerThanOneHundredCharacters() throws Exception {
        String longName = "A".repeat(101);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson("long-name@example.com", "Password123!", longName)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    private void registerUser(String email, String password, String name) throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(email, password, name)))
                .andExpect(status().isCreated());
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
