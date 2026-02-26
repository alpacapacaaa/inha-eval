package com.inhaeval.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {

    private String accessToken;  // JWT 토큰, 이후 API 요청시 인증/인가에 사용
    private String nickname;
    private int points;
}
