package com.iwt.invisibleworktracker.dto;

import com.fasterxml.jackson.annotation.JsonInclude;


//when a user logs in, it needs to respond safely and let the front end know
//doesnt return the user entity
//authentication response
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {


    private String token;
    private String message;

    public static AuthResponse of(String token, String message) {
        AuthResponse response = new AuthResponse();
        response.token = token;
        response.message = message;
        return response;

    }

    public static AuthResponse message(String message) {
        AuthResponse response = new AuthResponse();
        response.message = message;
        return response;

    }

    public String getToken() {
        return token;
    }

    public String getMessage() {
        return message;
    }
}

