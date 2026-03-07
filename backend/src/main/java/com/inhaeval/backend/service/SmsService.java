package com.inhaeval.backend.service;

import com.inhaeval.backend.exception.CustomException;
import net.nurigo.sdk.message.model.Message;
import net.nurigo.sdk.NurigoApp;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import net.nurigo.sdk.message.service.DefaultMessageService;

@Service
public class SmsService {

    private final DefaultMessageService messageService;

    @Value("${coolsms.from}")       // application.properties에서 coolsms.from값을 꺼내옴
    private String fromNumber;

    // coolSms SDK 객체는 스프링 빈이 아니므로 직접 초기화 해야함
    public SmsService(@Value("${coolsms.api.key}") String apiKey,
                      @Value("${coolsms.api.secret}") String apiSecret) {
        // coolsms SDK 초기화 -> apiKey + apiSecret으로 인증 -> coolsms 서버 주소 -> messageService 객체 생성 완료
        this.messageService = NurigoApp.INSTANCE.initialize(apiKey, apiSecret, "https://api.coolsms.co.kr");
    }

    public void sendSms(String toNumber, String code) {
        Message message = new Message();
        message.setFrom(fromNumber);    // 발신번호 (우리번호)
        message.setTo(toNumber);        // 수신번호 (사용자 번호)
        message.setText("[인하평] 인증번호: " + code + " (5분 내 입력해주세요)");

        try {
            messageService.sendOne(new net.nurigo.sdk.message.request.SingleMessageSendingRequest(message));
        } catch (Exception e) {
            throw new CustomException(HttpStatus.INTERNAL_SERVER_ERROR, "문자 발송에 실패했습니다.");
        }
    }
}
