import { Injectable } from '@nestjs/common';

export interface UserRecord {
  username: string;
  deviceId: string;
  name: string;
  fcmToken?: string;
}

export const SavedUser = [
  {
    "id":1,
    "username": "abi",
    "deviceId": "dev-1758948585545-android",
    "fcmToken": "db-uqt46LSfktV9YU-FXI4:APA91bGp3AtzT4p4cPq9NBmhhx4TVF6_Tpr6RxYhfNbPnEfNc8COTknXMECSYdAxLrUEknY31-pbUA0So7DXDDNMBDDclyS0O-0AEEPdc88iGkmZUP8LVKE"
  },
  {
    "id":2,
    "username": "sunil",
    "deviceId": "dev-1758881360486-android",
    "fcmToken": "fY2IThvyQnC0pkYf4XL7fC:APA91bFldbD771PFyOaJSr2_FDgJ7CnyfWBfZKXKpPmaUr_qleN0aNFfGLJ6KhSSkLB2cQjBa4OuKjlaMCnS3uDbol_afxMIHVQ9iLwEfNV7Cz3GIJO1COM"
  }
]

@Injectable()
export class UsersService {
  private readonly usersByUsername: Map<string, UserRecord> = new Map();
  private readonly usersByDeviceId: Map<string, UserRecord> = new Map();
  private readonly insertionOrder: string[] = [];

  upsertUser(user: UserRecord): UserRecord {
    const isNew = !this.usersByUsername.has(user.username);
    this.usersByUsername.set(user.username, user);
    this.usersByDeviceId.set(user.deviceId, user);
    if (isNew) {
      this.insertionOrder.push(user.username);
    }
    return user;
  }

  getByUsername(username: string): UserRecord | undefined {
    return this.usersByUsername.get(username);
  }

  getByDeviceId(deviceId: string): UserRecord | undefined {
    return this.usersByDeviceId.get(deviceId);
  }

  list(limit = 10, cursor?: string): { items: UserRecord[]; nextCursor?: string } {
    const startIndex = cursor ? parseInt(Buffer.from(cursor, 'base64').toString('utf8'), 10) : 0;
    const endIndex = Math.min(this.insertionOrder.length, startIndex + Math.max(1, limit));
    const usernames = this.insertionOrder.slice(startIndex, endIndex);
    const items = usernames
      .map((u) => this.usersByUsername.get(u))
      .filter((u): u is UserRecord => Boolean(u));
    const nextCursor = endIndex < this.insertionOrder.length ? Buffer.from(String(endIndex), 'utf8').toString('base64') : undefined;
    return { items, nextCursor };
  }

  all() {
    return SavedUser

  }
}


