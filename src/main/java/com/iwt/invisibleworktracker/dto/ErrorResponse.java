package com.iwt.invisibleworktracker.dto;

import java.time.LocalDateTime;
//store error info in a template and send back to user
//er = errorresponse

public class ErrorResponse{
    private int status ;
    private String message;
    private LocalDateTime timestamp;


    public static ErrorResponse of(int status, String message){

        ErrorResponse er = new ErrorResponse();

        er.status = status;
        er.message = message;
        er.timestamp = LocalDateTime.now();

        return er;

    }



    public int getStatus(){
        return status;
    }

    public String getMessage() {
        return message;
    }


    public LocalDateTime getTimestamp() {
        return timestamp;
    }

}

//no setters since it shouldnt be altered after made