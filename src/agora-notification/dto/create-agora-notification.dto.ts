// file: dto/send-agora-notification.dto.ts
import { IsString, IsOptional, IsObject } from 'class-validator';

export class SendAgoraNotificationDto {
  @IsString()
  token: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}

