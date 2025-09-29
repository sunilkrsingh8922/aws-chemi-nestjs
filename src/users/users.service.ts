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
    "deviceId": "hipster-1bd26",
    "fcmToken": "f5HJxAeSSRWpfWFSN8o1oM:APA91bFG7ApYJX8-OP6HWio1s4OSMKApD5eyBE4jmoH5jrUaPLJk3RyZAOGeY_QWyOnQFCttBpbw-JPfiIOGuZiBM1_X6jlvUVMsdDk84s9yKpjQFF9cris"
  },
  {
    "id":2,
    "username": "sunil",
    "deviceId": "hipster-1bd26",
    "fcmToken": "cLozKptYQSWv6QeFpI0c4o:APA91bEFQFTvvWZpIDUiB-xQNNiw41C2iciNwHMy3h2Jmdl31tzlFunBos7_yjha0TSZgbcuObKqdHdsatFKO6vcQkjmr9Xw6Sfd68V7AOMcpARuDhDqhsQ"
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


