package com.iwt.invisibleworktracker.service.impl;

import com.iwt.invisibleworktracker.entity.Session;
import com.iwt.invisibleworktracker.entity.User;
import com.iwt.invisibleworktracker.repository.SessionRepository;
import com.iwt.invisibleworktracker.repository.UserRepository;
import com.iwt.invisibleworktracker.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.TOO_MANY_REQUESTS;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

    private static final int MAX_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;
    private static final int SESSION_DAYS = 1;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthServiceImpl(
            UserRepository userRepository,
            SessionRepository sessionRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public User register(String email, String password, String name) {
        String normalizedEmail = normalizeEmail(email);

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(CONFLICT, "Email already registered");
        }

        User user = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(password))
                .name(name)
                .role("USER")
                .build();

        User savedUser = userRepository.save(user);
        log.info("Registered user: {}", savedUser.getEmail());
        return savedUser;
    }

    @Override
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public String login(String email, String password) {
        String normalizedEmail = normalizeEmail(email);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid credentials"));

        if (!user.isActive()) {
            throw new ResponseStatusException(FORBIDDEN, "Account disabled");
        }

        if (isLocked(user)) {
            throw new ResponseStatusException(TOO_MANY_REQUESTS, "Account temporarily locked");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            handleFailedLogin(user);
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid credentials");
        }

        resetLoginState(user);

        String rawToken = generateRawToken();
        String hashedToken = hashToken(rawToken);

        sessionRepository.save(Session.builder()
                .token(hashedToken)
                .valid(true)
                .user(user)
                .expiresAt(LocalDateTime.now().plusDays(SESSION_DAYS))
                .build());

        log.info("User logged in: {}", user.getEmail());
        return rawToken;
    }

    @Override
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public User validate(String rawToken) {
        String hashedToken = hashToken(rawToken);

        Session session = sessionRepository.findByTokenAndValidTrue(hashedToken)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid session"));

        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            session.setValid(false);
            sessionRepository.save(session);
            throw new ResponseStatusException(UNAUTHORIZED, "Session expired");
        }

        return session.getUser();
    }

    @Override
    @Transactional
    public void logout(String rawToken) {
        String hashedToken = hashToken(rawToken);

        sessionRepository.findByToken(hashedToken).ifPresent(session -> {
            session.setValid(false);
            sessionRepository.save(session);
        });
    }

    private boolean isLocked(User user) {
        return user.getAccountUnlockedUntil() != null
                && LocalDateTime.now().isBefore(user.getAccountUnlockedUntil());
    }

    private void handleFailedLogin(User user) {
        user.setFailedAttempts(user.getFailedAttempts() + 1);
        user.setLastFailedLogin(LocalDateTime.now());

        if (user.getFailedAttempts() >= MAX_ATTEMPTS) {
            user.setAccountUnlockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_MINUTES));
        }

        userRepository.save(user);
    }

    private void resetLoginState(User user) {
        user.setFailedAttempts(0);
        user.setLastFailedLogin(null);
        user.setAccountUnlockedUntil(null);
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Token hashing failed", e);
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }
}
