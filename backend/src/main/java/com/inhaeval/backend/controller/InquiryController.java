package com.inhaeval.backend.controller;

import com.inhaeval.backend.dto.InquiryRequest;
import com.inhaeval.backend.dto.InquiryResponse;
import com.inhaeval.backend.service.InquiryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/inquiries")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    @PostMapping
    public ResponseEntity<InquiryResponse> submit(
            @RequestBody InquiryRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(inquiryService.submit(request, authentication.getName()));
    }

    @GetMapping("/my")
    public ResponseEntity<List<InquiryResponse>> getMyInquiries(Authentication authentication) {
        return ResponseEntity.ok(inquiryService.getMyInquiries(authentication.getName()));
    }
}
