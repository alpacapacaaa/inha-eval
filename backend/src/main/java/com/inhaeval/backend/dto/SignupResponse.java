package com.inhaeval.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SignupResponse {

    private String accessToken;
    private String nickname;
    // 회원가입 직후 앱이 바로 홈으로 이동할 때 학과 정보를 갖고 있어야 한다.
    // LoginResponse와 동일한 이유로 추가.
    private String department;
    private int points;

}
