package com.iwt.invisibleworktracker.config;

import com.iwt.invisibleworktracker.security.SecurityErrorResponseWriter;
import com.iwt.invisibleworktracker.security.SessionTokenFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
// file defines the security rules
// make endpoints public or protected
// disable unused default spring system
// register the sessiontokenfilter
// also configure stateless api security
public class SecurityConfig {

    private final SessionTokenFilter sessionTokenFilter;
    private final SecurityErrorResponseWriter securityErrorResponseWriter;

    public SecurityConfig(
            SessionTokenFilter sessionTokenFilter,
            SecurityErrorResponseWriter securityErrorResponseWriter
    ) {
        this.sessionTokenFilter = sessionTokenFilter;
        this.securityErrorResponseWriter = securityErrorResponseWriter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) ->
                                securityErrorResponseWriter.writeUnauthorized(response)
                        )
                )

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/", "/index.html", "/styles.css", "/app.js", "/favicon.ico").permitAll()
                        .requestMatchers(HttpMethod.GET, "/assets/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/auth/register").permitAll()
                        .requestMatchers(HttpMethod.POST, "/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/health").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(
                        sessionTokenFilter,
                        UsernamePasswordAuthenticationFilter.class
                );
        return http.build();
    }

}
