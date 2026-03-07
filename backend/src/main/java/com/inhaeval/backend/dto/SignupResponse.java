package com.inhaeval.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SignupResponse {

    private String accessToken;
    private String nickname;
    private int points;

}
