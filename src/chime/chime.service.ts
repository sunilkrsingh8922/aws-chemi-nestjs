// src/chime/chime.service.ts
import { ChimeSDKMeetingsClient, CreateAttendeeCommand, CreateMeetingCommand, CreateMeetingCommandOutput } from '@aws-sdk/client-chime-sdk-meetings';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as admin from 'firebase-admin';
import { AcceptMeeting, CreateCallMeeting, INotification } from './dto/createCall.dto';
import { SavedUser } from 'src/users/users.service';
const meetings:Record<string,CreateMeetingCommandOutput['Meeting']> = {}

@Injectable()
export class ChimeService {
  private meetings: Record<string, any> = {};
  chime: ChimeSDKMeetingsClient;
  constructor(private readonly configService: ConfigService
  ) {
    AWS.config.update({
      region: this.configService.get<string>('AWS_REGION'), credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY') ?? "",
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_KEY') ?? "",
      }
    });
    const firebaseProjectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const firebaseClientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const firebasePrivateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!admin.apps.length) {
      try {
        if (gacPath) {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
          });
        } else if (firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: firebaseProjectId,
              clientEmail: firebaseClientEmail,
              privateKey: firebasePrivateKey.replace(/\\n/g, '\n'),
            }),
          });
        }
        if (admin.apps.length) {
          // eslint-disable-next-line no-console
          console.log('Firebase initialized for project:', (admin.app().options as any)?.projectId ?? 'unknown');
        }
      } catch (err) {
        // Defer throwing to send time to avoid crashing app on boot.
        // eslint-disable-next-line no-console
        console.error('Failed to initialize Firebase Admin SDK:', err);
      }
    }
    this.chime = new ChimeSDKMeetingsClient({
      region: 'us-east-1', credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY') ?? "",
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_KEY') ?? "",
      }, endpoint: "https://meetings-chime.us-east-1.amazonaws.com"
    });
  }

  async createMeeting(token:string) {
    const input = { // CreateMeetingRequest
      ClientRequestToken: token+Math.round(Math.random()*10),
      MediaRegion: 'us-east-1',
      ExternalMeetingId: "Public", // required

      MeetingFeatures: { // MeetingFeaturesConfiguration
        Audio: { // AudioFeatures
          EchoReduction: "AVAILABLE",
        },
        Video: { // VideoFeatures
          MaxResolution: "HD",
        },
        Attendee: { // AttendeeFeatures
          MaxCount: 3,
        },
      },
    };
    const command = new CreateMeetingCommand(input as any);
    const response = await this.chime.send(command);
    return response;
  }

  async createAtendee(meetingId: string, name: string) {
    const attendeeResponse = await this.chime.send(
      new CreateAttendeeCommand({
        MeetingId: meetingId,
        ExternalUserId: name,
      })
    );
    return attendeeResponse
  }

  async call(createCallMeeting: CreateCallMeeting) {
    const {username,attendeeId}=createCallMeeting;
    const attendeUser=SavedUser.find((s)=>s.id==+attendeeId);
    if(!attendeUser) throw new NotFoundException({message:"Attendee not found"})
    const {Meeting} =  await this.createMeeting(username+attendeeId);
    console.log({Meeting})
    if(!Meeting?.MeetingId) throw new BadRequestException({message:"Server error exceptions"});
    const meetingId=Meeting!.MeetingId!;
    meetings[Meeting.MeetingId] = Meeting
    const {Attendee} = await this.createAtendee(meetingId!, username);

    await this.sendPushNotification({
      name:attendeUser.username,
      fcmToken:attendeUser.fcmToken,
      meetingId,
    });

    return {
      Meeting,
      Attendee,
    };
  }


  async fcmStatus(deviceToken?: string) {
    const initialized = admin.apps.length > 0;
    const projectId = initialized ? ((admin.app().options as any)?.projectId ?? 'unknown') : undefined;
    if (deviceToken && initialized) {
      try {
        const dryRunMsg: admin.messaging.Message = {
          token: deviceToken,
          data: { ping: 'true' },
        };
        await admin.messaging().send(dryRunMsg, true);
        return { initialized, projectId, tokenValid: true };
      } catch (err: any) {
        return { initialized, projectId, tokenValid: false, error: err?.message ?? String(err) };
      }
    }
    return { initialized, projectId };
  }

  async sendPushNotification(notification:INotification) {
    const {name,fcmToken,meetingId}=notification
    // if (!deviceToken) {
    //   throw new BadRequestException('Missing device token for FCM');
    // }
    // if (!admin.apps.length) {
    //   throw new BadRequestException('Firebase Admin not initialized. Provide GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_* env vars.');
    // }

    const callerName = name ?? 'Unknown';
    const title = 'Incoming Chime Call';
    const body = `${callerName} invited you. Join meeting ${meetingId}`;

    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        meetingId,
        name: callerName,
        type: 'CALL_INVITE',
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'calls',
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true,
          },
        } as any,
      },
    };

    try {
      const response = await admin.messaging().send(message);
      return { messageId: response };
    } catch (err: any) {
      throw new BadRequestException(`FCM send failed: ${err?.message ?? 'unknown error'}`);
    }
  }

  async acceptCall(accept:AcceptMeeting) {
    const {meetingId,name}=accept;
    const {Attendee} = await this.createAtendee(meetingId, name)
    const Meeting = meetings[meetingId];
    return {Attendee,Meeting}
  }
}
