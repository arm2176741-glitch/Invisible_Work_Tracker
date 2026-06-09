package com.iwt.invisibleworktracker.security;

import com.iwt.invisibleworktracker.entity.User;
import com.iwt.invisibleworktracker.service.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class SessionTokenFilter extends OncePerRequestFilter {


    private final AuthService authService;
    private final SecurityErrorResponseWriter securityErrorResponseWriter;

    public SessionTokenFilter(
            AuthService authService,
            SecurityErrorResponseWriter securityErrorResponseWriter
    ) {

        this.authService = authService;
        this.securityErrorResponseWriter = securityErrorResponseWriter;

    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain

    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;

        }
        try {
            //this removes the bearer
            String rawToken = authHeader.substring(7);

            //validates the token using authservice
            User user = authService.validate(rawToken);

            //creates spring security authentication object
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    user,
                    null,
                    Collections.emptyList()
            );
            authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request)
            );

            //Lets security know the request is authenticated
            SecurityContextHolder.getContext()
                    .setAuthentication(authentication);
        } catch (Exception ex) {
            //clears the authenication if the token is invalid
            SecurityContextHolder.clearContext();
            securityErrorResponseWriter.writeUnauthorized(response);
            return;
        }

        filterChain.doFilter(request, response);
    }
}
