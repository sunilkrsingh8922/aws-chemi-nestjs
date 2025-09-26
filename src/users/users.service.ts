import { Injectable } from '@nestjs/common';

export interface UserRecord {
  username: string;
  deviceId: string;
  name: string;
  fcmToken?: string;
}

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

  all(): UserRecord[] {
    return this.insertionOrder
      .map((u) => this.usersByUsername.get(u))
      .filter((u): u is UserRecord => Boolean(u));
  }
}


