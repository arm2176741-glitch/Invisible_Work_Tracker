package com.iwt.invisibleworktracker.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// dto for incoming login requests used by /auth/login endpoint
public class LoginRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address format")
    private String email;

    @NotBlank(message = "Please enter password")
    @Size(max = 72, message = "Password cannot exceed 72 characters")
    private String password;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
