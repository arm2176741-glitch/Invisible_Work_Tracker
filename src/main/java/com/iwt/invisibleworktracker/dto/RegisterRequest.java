package com.iwt.invisibleworktracker.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
    private String password;

    @NotBlank(message = "Name is required")
    @Size(max = 100, message = "Name cant exceed 100 characters")
    private String name;

    public RegisterRequest() {
    }

    public RegisterRequest(String email, String password, String name) {
        this.email = email;
        this.password = password;
        this.name = name;
    }

    // getter for email
    public String getEmail() {
        return email;
    }

    // setter for email
    public void setEmail(String email) {
        this.email = email;
    }

    // getter for password
    public String getPassword() {
        return password;
    }

    // setter for password
    public void setPassword(String password) {
        this.password = password;
    }

    // getter for name
    public String getName() {
        return name;
    }

    // setter for name
    public void setName(String name) {
        this.name = name;
    }
}
