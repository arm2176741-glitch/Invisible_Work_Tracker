package com.iwt.invisibleworktracker.repository;
import com.iwt.invisibleworktracker.entity.User;
import com.iwt.invisibleworktracker.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

//DB access for the Session table
public interface SessionRepository extends JpaRepository<Session, Long> {
    //find a session by its token (login and during authentication)
    Optional<Session> findByToken(String token);


    Optional<Session> findByTokenAndValidTrue(String token);

    Optional<Session> findByTokenAndValidTrueAndExpiresAtAfter(
            String token,
            LocalDateTime now
    );
    Optional<Session> findByUserAndValidTrue(User user);

    void deleteByExpiresAtBefore(LocalDateTime cutoff);
}
