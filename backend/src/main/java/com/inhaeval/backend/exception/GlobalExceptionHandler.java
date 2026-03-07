package com.inhaeval.backend.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // CustomException 발생 시 이 메서드가 처리
    @ExceptionHandler(CustomException.class)
    public ResponseEntity<Map<String, String>> handleCustomException(CustomException e) {
        log.error("CustomException: {}", e.getMessage());  // 서버 콘솔에 뜨는 메세지 (백엔드용)
        Map<String, String> error = new HashMap<>();
        error.put("message", e.getMessage());       // 클라이언트에게 JSON 반환 (프론트용)
        return ResponseEntity.status(e.getStatus()).body(error);    // e.getStatus(): 우리가 지정한 HTTP 상태코드
    }

    // @Valid 검증 실패 시 이 메서드가 처리
    @ExceptionHandler(MethodArgumentNotValidException.class)   // @Valid 검증 실패 시 Spring이 자동으로 MethodArg... 예외처리 던짐
    public ResponseEntity<Map<String, String>> handleValidException(MethodArgumentNotValidException e) {
        Map<String, String> error = new HashMap<>();
        e.getBindingResult().getFieldErrors()       // 검증 실패한 필드 목록 꺼냄
                .forEach(fe -> error.put(fe.getField(), fe.getDefaultMessage()));
        return ResponseEntity.badRequest().body(error);
    }

    // 그 외 예외 처리
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception e) {
        log.error("Exception: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("message", "서버 오류가 발생했습니다.");
        return ResponseEntity.internalServerError().body(error);
    }
}
