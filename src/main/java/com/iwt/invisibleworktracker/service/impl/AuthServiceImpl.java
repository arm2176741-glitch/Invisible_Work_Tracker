package com.iwt.invisibleworktracker.service.impl;

import com.iwt.invisibleworktracker.entity.Session;
import com.iwt.invisibleworktracker.entity.User;
import com.iwt.invisibleworktracker.repository.SessionRepository;
import com.iwt.invisibleworktracker.repository.UserRepository;
import com.iwt.invisibleworktracker.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

import static org.springframework.http.HttpStatus.*;

@Service
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    private static final int MAX_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;
    private static final int SESSION_DAYS = 1;

    public AuthServiceImpl(
            UserRepository userRepository,
            SessionRepository sessionRepository,
            BCryptPasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public User register(String email, String password, String name) {

        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(CONFLICT, "Email already registered");
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .name(name)
                .role("USER")
                .build();

        return userRepository.save(user);
    }

    @Override
    @Transactional
    public String login(String email, String password) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResponseStatusException(UNAUTHORIZED, "Invalid credentials"));

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

        log.info("User logged in: {}", email);

        return rawToken;
    }

    @Override
    @Transactional
    public User validate(String rawToken) {

        String hashedToken = hashToken(rawToken);

        Session session = sessionRepository.findByTokenAndValidTrue(hashedToken)
                .orElseThrow(() ->
                        new ResponseStatusException(UNAUTHORIZED, "Invalid session"));

        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            session.setValid(false);
            sessionRepository.save(session);
            throw new ResponseStatusException(UNAUTHORIZED, "Session expired");
        }

        return session.getUser();
    }
    @Transactional
    @Override
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
            user.setAccountUnlockedUntil(
                    LocalDateTime.now().plusMinutes(LOCKOUT_MINUTES)
            );
        }

        userRepository.save(user);
    }

    private void resetLoginState(User user) {
        user.setFailedAttempts(0);
        user.setLastFailedLogin(null);
        user.setAccountUnlockedUntil(null);
        user.setLastLogin(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    private String generateRawToken() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes());
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Token hashing failed", e);
        }
    }
}