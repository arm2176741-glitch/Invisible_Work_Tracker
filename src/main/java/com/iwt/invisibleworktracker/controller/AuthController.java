package com.iwt.invisibleworktracker.controller;

import com.iwt.invisibleworktracker.dto.AuthResponse;
import com.iwt.invisibleworktracker.dto.LoginRequest;
import com.iwt.invisibleworktracker.dto.RegisterRequest;
import com.iwt.invisibleworktracker.entity.User;
import com.iwt.invisibleworktracker.service.AuthService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;


//traffic incoming authentication API requests
//return http responses
@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {

        log.info("Register attempt: {}", request.getEmail());

        User user = authService.register(
                request.getEmail(),
                request.getPassword(),
                request.getName()
        );

        log.info("Registered successfully: {}", user.getEmail());

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(AuthResponse.message("Account created successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request) {

        log.info("Login attempt: {}", request.getEmail());

        String rawToken = authService.login(
                request.getEmail(),
                request.getPassword()
        );

        log.info("Login successful: {}", request.getEmail());

        return ResponseEntity.ok(
                AuthResponse.of(rawToken, "Login successful")
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String rawToken = authHeader.substring(7);

        authService.logout(rawToken);

        log.info("Session invalidated via logout endpoint");
        return ResponseEntity.noContent().build();

    }

    @GetMapping("/me") // returns user info after authentication
    public ResponseEntity<UserInfo> me(Authentication authentication) {
        User user = (User) authentication.getPrincipal();

        return ResponseEntity.ok(new UserInfo(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole()
        ));
    }


    public record UserInfo(Long id, String email, String name, String role) {
    }
}
