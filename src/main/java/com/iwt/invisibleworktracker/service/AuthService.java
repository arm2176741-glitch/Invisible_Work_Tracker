package com.iwt.invisibleworktracker.service;

import com.iwt.invisibleworktracker.entity.user.User;

public interface AuthService {

    User register(String email, String password, String name);

    String login(String email, String password);

    User validate(String rawToken);

    void logout(String rawToken);
}