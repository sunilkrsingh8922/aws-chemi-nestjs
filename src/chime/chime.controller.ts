// src/chime/chime.controller.ts
import { Controller, Post, Body, Query, Param, BadRequestException, Get } from '@nestjs/common';
import { ChimeService } from './chime.service';
import { AcceptMeeting, CreateCallMeeting } from './dto/createCall.dto';

@Controller('chime')
export class ChimeController {
  constructor(private readonly chimeService: ChimeService) {}

  // @Post('createMeeting')
  // async createMeeting() {
  //   return await this.chimeService.createMeeting();
  // }

  // @Post('createAtendee')
  // async createAtendee(@Body('meetingId') meetingId,@Body('userId') userId) {
  //   console.log("meeting id",meetingId)
  //   return await this.chimeService.createAtendee(meetingId,userId);
  // }

  @Post('call')
  async call(@Body() body:CreateCallMeeting) {
    return await this.chimeService.call(body);
  }

  // @Post('call/accept')
  // async accept(@Body() body:AcceptMeeting) {
  //   return await this.chimeService.acceptCall(body);
  // }

  @Post('fcmStatus')
  async fcmStatus(@Body('fcmToken') fcmToken?: string) {
    return await this.chimeService.fcmStatus(fcmToken);
  }

  @Get(":meetingId")
  getAttendeeList(@Param("meetingId") meetingId:string){
    console.log("emting...",meetingId)
    if(!meetingId) throw new BadRequestException({message:"Meeting id is missing"});
    return this.chimeService.getAttendeeList(meetingId);
  }
}
