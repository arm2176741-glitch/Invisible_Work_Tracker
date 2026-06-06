package com.iwt.invisibleworktracker.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;

@Component
public class SecurityErrorResponseWriter {

    public void writeUnauthorized(HttpServletResponse response) throws IOException {
        if (response.isCommitted()) {
            return;
        }

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("""
                {"status":401,"message":"Unauthorized","timestamp":"%s"}\
                """.formatted(LocalDateTime.now()));
    }
}
