package com.iwt.invisibleworktracker.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateOrganizationRequest {

    @NotBlank(message = "Organization name is required")
    @Size(max = 150, message = "Organization name cannot exceed 150 characters")
    private String name;

    public CreateOrganizationRequest() {
    }

    public CreateOrganizationRequest(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
