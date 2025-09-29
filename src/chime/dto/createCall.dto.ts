import { IsNotEmpty, IsNumber, IsNumberString, IsString } from "class-validator";

export class CreateCallMeeting{

    @IsNotEmpty()
    @IsString()
    callerId:string;


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


// {
//     "Meeting": {
//         "ExternalMeetingId": "Public",
//         "MediaPlacement": {
//             "AudioFallbackUrl": "wss://wss.k.m2.ue1.app.chime.aws:443/calls/24b2a154-caf1-4a7b-8f7b-5f710a142713",
//             "AudioHostUrl": "2a0232c2815757a6ad64cbd805ace785.k.m2.ue1.app.chime.aws:3478",
//             "EventIngestionUrl": "https://data.svc.ue1.ingest.chime.aws/v1/client-events",
//             "ScreenDataUrl": "wss://bitpw.m2.ue1.app.chime.aws:443/v2/screen/24b2a154-caf1-4a7b-8f7b-5f710a142713",
//             "ScreenSharingUrl": "wss://bitpw.m2.ue1.app.chime.aws:443/v2/screen/24b2a154-caf1-4a7b-8f7b-5f710a142713",
//             "ScreenViewingUrl": "wss://bitpw.m2.ue1.app.chime.aws:443/ws/connect?passcode=null&viewer_uuid=null&X-BitHub-Call-Id=24b2a154-caf1-4a7b-8f7b-5f710a142713",
//             "SignalingUrl": "wss://signal.m2.ue1.app.chime.aws/control/24b2a154-caf1-4a7b-8f7b-5f710a142713",
//             "TurnControlUrl": "https://2713.cell.us-east-1.meetings.chime.aws/v2/turn_sessions"
//         },
//         "MediaRegion": "us-east-1",
//         "MeetingArn": "arn:aws:chime:us-east-1:476057873255:meeting/24b2a154-caf1-4a7b-8f7b-5f710a142713",
//         "MeetingFeatures": {
//             "Attendee": {
//                 "MaxCount": 3
//             },
//             "Audio": {
//                 "EchoReduction": "AVAILABLE"
//             },
//             "Video": {
//                 "MaxResolution": "HD"
//             }
//         },
//         "MeetingId": "24b2a154-caf1-4a7b-8f7b-5f710a142713",
//         "TenantIds": []
//     },
//     "Attendee": {
//         "AttendeeId": "e1ef1bf5-12b2-8159-575e-6b0dfd6f5c7f",
//         "Capabilities": {
//             "Audio": "SendReceive",
//             "Content": "SendReceive",
//             "Video": "SendReceive"
//         },
//         "ExternalUserId": "abhi",
//         "JoinToken": "ZTFlZjFiZjUtMTJiMi04MTU5LTU3NWUtNmIwZGZkNmY1YzdmOjJiNDljNTlkLWVhMTctNDA3MS1hZWEzLTI2ODcwMjMxZTZkYw"
//     }
// }