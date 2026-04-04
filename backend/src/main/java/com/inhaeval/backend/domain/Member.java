package com.inhaeval.backend.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "members")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    private String phoneNumber;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String nickname;

    @Column(nullable = false)
    private String department;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING) // db에 숫자 대신 문자열로 저장 ("USER", "ADMIN")
    private Role role;           // 관리자 모드, 일반 유저 모드

    public enum Role {
        USER, ADMIN
    }

    @Column(nullable = false)
    private boolean isActive;    /** 탈퇴하더라도 회원이 남긴 강의평 등 데이터는 남아 있어야함.
                                        실제로 db에서 데이터를 지우진 않음 **/
    @Column(nullable = false)
    private int points;

    @Column(nullable = false)
    private boolean isVerified;

    //private String verifyToken;  /** 토큰 필드는 따로 테이블을 만들어 사용하기로 함 **/

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "pass_expiry_date")
    private LocalDateTime passExpiryDate;   // 열람권

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.points = 0;
        this.isVerified = false; //
        this.isActive = true;   // 가입 시 활성 상태
        this.role = Role.USER;  // 가입 시 일반유저로 설정
    }

    public void addPoints(int amount) { this.points += amount; }
    public void deductPoints(int amount) { this.points -= amount; }
    public void verify() { this.isVerified = true; }
    public void deactivate() { this.isActive = false; }
    public void updatePassword(String newPassword) { this.password = newPassword; }
    public void extendPass(long days) {
        if (this.passExpiryDate != null && 
        this.passExpiryDate.isAfter(LocalDateTime.now())) {
            this.passExpiryDate = this.passExpiryDate.plusDays(days); 
        } else {
            this.passExpiryDate = LocalDateTime.now().plusDays(days);
        }
    }
    public void updateNickname(String nickname) { this.nickname = nickname; }
    public void updateDepartment(String department) { this.department = department; }
    public void updatePhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public void reactivate(String password, String nickname, String department, String phoneNumber) {
        this.password = password;
        this.nickname = nickname;
        this.department = department;
        this.phoneNumber = phoneNumber;
        this.isActive = true;
        this.isVerified = true;
        this.points = 50;
        this.passExpiryDate = null;
        this.role = Role.USER;
    }
}