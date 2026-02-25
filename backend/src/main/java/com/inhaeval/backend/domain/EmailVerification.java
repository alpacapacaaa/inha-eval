package com.inhaeval.backend.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_verifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class EmailVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String token;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private boolean isUsed;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.isUsed = false;
        this.expiresAt = LocalDateTime.now().plusMinutes(30);
    }

    public void use() {this.isUsed = true;}

}
