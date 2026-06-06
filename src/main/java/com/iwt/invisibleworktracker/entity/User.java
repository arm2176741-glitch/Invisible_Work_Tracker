package com.iwt.invisibleworktracker.entity;
import lombok.*;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity//makes the class a JPA entity
@Table(name = "users")//names the table
@NoArgsConstructor//makes a no-argument cosntructor
@ToString(exclude = "passwordHash")
@Data//generates hashCode, equals, toString, setterrs, getters
@AllArgsConstructor//generates a constructor with  ALL fields
@Builder// allows buiding User objects


public class User {
    @Id// primary key

    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; //automatically assigns increasing IDs in the DB

    @Column(nullable = false, unique = true, length = 254)
    private String email; //creates a column that cant be null and has to be unqiue
    //prevents users from registering with the same account


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
    protected void onCreate(){
    this.createdAt = LocalDateTime.now();
    this.updatedAt = LocalDateTime.now();
    this.isActive = true;
    this.failedAttempts = 0 ;

}
@PreUpdate
    protected void onUpdated() {
    this.updatedAt = LocalDateTime.now();
}

}
