import { Controller, Get, Post, Body, Query, NotFoundException } from '@nestjs/common';
import { UsersService, UserRecord } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('add')
  addUser(@Body() body: { username: string; deviceId: string; name: string; fcmToken?: string }) {
    const { username, deviceId, name, fcmToken } = body;
    const record: UserRecord = { username, deviceId, name, fcmToken };
    return this.usersService.upsertUser(record);
  }

  @Get('by-username')
  getByUsername(@Query('username') username: string) {
    const user = this.usersService.getByUsername(username);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Get('by-device')
  getByDevice(@Query('deviceId') deviceId: string) {
    const user = this.usersService.getByDeviceId(deviceId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Get('list')
  list(@Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    const lim = limit ? parseInt(limit, 10) : 10;
    return this.usersService.list(lim, cursor);
  }

  @Get('all')
  all() {
    return this.usersService.all();
  }
}


