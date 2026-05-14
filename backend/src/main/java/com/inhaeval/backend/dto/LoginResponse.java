package com.inhaeval.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {

    private String accessToken;
    private String refreshToken;
    private String nickname;
    private String department;
    private int points;
}
