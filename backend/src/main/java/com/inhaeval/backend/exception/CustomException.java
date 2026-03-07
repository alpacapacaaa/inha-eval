package com.inhaeval.backend.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class CustomException extends RuntimeException{

    private final HttpStatus status;
    private final String message;

    public CustomException(HttpStatus status, String message) {
        super(message);         // RuntimeException(message) 호출
        this.status = status;
        this.message = message;
    }
}
