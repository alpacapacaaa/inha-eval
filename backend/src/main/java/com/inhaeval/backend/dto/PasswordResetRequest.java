package com.inhaeval.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class PasswordResetRequest {

    @NotBlank(message = "전화번호를 입력해주세요")
    @Pattern(regexp = "^01[0-9]{8,9}$", message = "올바른 전화번호 형식이 아닙니다")
    private String phoneNumber;

    @NotBlank(message = "새 비밀번호를 입력해주세요")
    @Pattern(
            regexp = "^(?=.*[a-zA-Z])(?=.*[0-9]).{8,}$",
            message = "비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다"
    )
    private String newPassword;

    @NotBlank(message = "비밀번호 확인을 입력해주세요")
    private String newPasswordConfirm;
}