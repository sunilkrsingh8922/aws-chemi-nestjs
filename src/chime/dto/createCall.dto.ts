import { IsNotEmpty, IsNumber, IsNumberString, IsString } from "class-validator";

export class CreateCallMeeting{
    @IsNotEmpty()
    @IsString()
    username:string

    @IsNotEmpty()
    @IsNumberString()
    attendeeId:string;

}

export class AcceptMeeting{
    @IsNotEmpty()
    @IsString()
    meetingId:string

    @IsNotEmpty()
    @IsNumberString()
    name:string;

}


export interface INotification{
    name:string,
    fcmToken:string;
    meetingId:string;
}