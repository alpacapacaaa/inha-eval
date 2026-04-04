package com.inhaeval.backend.service;

import com.inhaeval.backend.domain.Inquiry;
import com.inhaeval.backend.domain.Member;
import com.inhaeval.backend.dto.InquiryRequest;
import com.inhaeval.backend.dto.InquiryResponse;
import com.inhaeval.backend.repository.InquiryRepository;
import com.inhaeval.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public InquiryResponse submit(InquiryRequest request, String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        Inquiry inquiry = Inquiry.builder()
                .member(member)
                .category(request.getCategory())
                .title(request.getTitle())
                .content(request.getContent())
                .build();

        return InquiryResponse.from(inquiryRepository.save(inquiry));
    }

    @Transactional(readOnly = true)
    public List<InquiryResponse> getMyInquiries(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        return inquiryRepository.findByMemberIdOrderByCreatedAtDesc(member.getId())
                .stream()
                .map(InquiryResponse::from)
                .collect(Collectors.toList());
    }
}
