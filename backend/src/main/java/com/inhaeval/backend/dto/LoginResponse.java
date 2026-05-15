package com.inhaeval.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {

    private String accessToken;
    private String refreshToken;
    private String nickname;
    // 모바일 앱의 AuthContext가 로그인 직후 department를 저장해야 한다.
    // 별도의 /api/users/me 호출 없이 로그인 응답 한 번으로 프로필을 채우기 위해 추가.
    private String department;
    private int points;
}
