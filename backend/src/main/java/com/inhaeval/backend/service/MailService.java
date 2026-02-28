package com.inhaeval.backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;

    public void sendVerificationEmail(String toEmail, String token) {

        String verifyUrl = "http://localhost:8080/api/auth/verify?token=" + token;

        String htmlContent = "<h2>인하대 강의평가 이메일 인증</h2>" +
                "<p>아래 버튼을 클릭하면 인증이 완료됩니다.</p>" +
                "<a href='" + verifyUrl
                + "' style='padding:10px 20px; background:#0055A4; color:white; text-decoration:none; border-radius:5px;'>"
                +
                "이메일 인증하기</a>" +
                "<p>링크는 30분 후 만료됩니다.</p>";

        try {
            // HTML 형식 이메일을 담는 객체
            MimeMessage message = mailSender.createMimeMessage();

            // MimeMessage를 쉽게 세팅하는 도우미 클래스
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");

            helper.setTo(toEmail); // 수신자
            helper.setSubject("[인하평] 이메일 인증을 완료해주세요"); // 제목
            helper.setText(htmlContent, true); // 본문

            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("메일 발송에 실패했습니다.", e);
        }
    }
}
