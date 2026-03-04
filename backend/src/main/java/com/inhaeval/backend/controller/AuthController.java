package com.inhaeval.backend.controller;

import com.inhaeval.backend.dto.SignupRequest;
import com.inhaeval.backend.dto.SignupResponse;
import com.inhaeval.backend.service.EmailVerificationService;
import com.inhaeval.backend.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final MemberService memberService;
    private final EmailVerificationService emailVerificationService;

    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signup(@Valid @RequestBody SignupRequest request){
        SignupResponse response = memberService.signup(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/verify")
    public ResponseEntity<Void> verify(@RequestParam String token){
        emailVerificationService.verifyToken(token);
        return ResponseEntity.ok().build();
    }
}
