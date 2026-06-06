package com.iwt.invisibleworktracker.entity;
import lombok.*;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name ="sessions")
@NoArgsConstructor
@Data
@AllArgsConstructor
@Builder

public class Session {
   @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
   private String token; //identifies the user login session

    private boolean valid;
    //true = user logged in
    //false = user logged out


    //many sessions can come from one user
    @ManyToOne
    @JoinColumn(name ="user_id")
    private User user;
    //foreign key column named user_id

//when the session expires
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    //set createAt before saving
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }


}
