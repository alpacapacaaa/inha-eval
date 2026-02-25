package com.inhaeval.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class SignupRequest {

    @NotBlank(message = "이메일을 입력해주세요")
    @Email(message = "이메일 형식이 올바르지 않습니다")
    @Pattern(regexp = ".*@inha\\.ac\\.kr$", message = "인하대 이메일만 가입 가능합니다")
    private String email;

    @NotBlank(message = "학번을 입력해주세요")
    @Pattern(regexp = "^[0-9]{8}$", message = "학번은 8자리 숫자입니다")
    private String studentId;

    @NotBlank(message = "비밀번호를 입력해주세요")
    @Size(min = 8, message = "비밀번호는 8자 이상이어야 합니다")
    private String password;

    @NotBlank(message = "학과를 입력해주세요")
    private String department;

    @NotBlank(message = "닉네임을 입력해주세요")
    @Size(min = 2, max = 10, message = "닉네임은 2~10자로 입력해주세요")
    private String nickname;
}
