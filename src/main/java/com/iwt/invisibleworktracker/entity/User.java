package com.iwt.invisibleworktracker.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity//makes the class a JPA entity
@Table(name = "users")//names the table
@Getter
@Setter
@NoArgsConstructor//makes a no-argument cosntructor
@ToString(exclude = "passwordHash")
@AllArgsConstructor//generates a constructor with  ALL fields
@Builder// allows building User objects
@EqualsAndHashCode(onlyExplicitlyIncluded = true)


public class User {
    @Id// primary key
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; //automatically assigns increasing IDs in the DB

    @Column(nullable = false, unique = true, length = 254)
    private String email; //creates a column that cant be null and has to be unqiue
    //prevents users from registering with the same account

    @JsonIgnore
    @Column(nullable = false, name = "password_hash")
    private String passwordHash;//password cant be null, make pw secure

    private String name;
    private String role; //user or admin

    @Column(name = "failed_attempts")
    private int failedAttempts;

    //timestamp of last failed login
    @Column(name = "last_failed_login")
    private LocalDateTime lastFailedLogin;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(name = "account_unlocked_until")
    private LocalDateTime accountUnlockedUntil;

    //is the account still active
    @Column(name = "is_active")
    private boolean isActive;

    //when the user was created
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    //when was the last time the user was last updated
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.isActive = true;
        this.failedAttempts = 0;

    }

    @PreUpdate
    protected void onUpdated() {
        this.updatedAt = LocalDateTime.now();
    }

}
