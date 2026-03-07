package com.inhaeval.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class EmailSendRequest {

    @NotBlank(message = "이메일을 입력해주세요")
    @Email(message = "이메일 형식이 올바르지 않습니다")
    @Pattern(regexp = ".*@inha\\.ac\\.kr$", message = "인하대 이메일만 가입 가능합니다")
    private String email;
}
