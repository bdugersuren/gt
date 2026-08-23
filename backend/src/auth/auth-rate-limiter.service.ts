import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class AuthRateLimiter {
  private readonly attempts = new Map<string, number[]>();

  check(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const recent = (this.attempts.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
    if (recent.length >= limit) {
      throw new HttpException('Хэт олон хүсэлт илгээгдлээ. Түр хүлээгээд дахин оролдоно уу.', HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
    this.attempts.set(key, recent);
    if (this.attempts.size > 10_000) {
      for (const [entry, timestamps] of this.attempts) {
        if (!timestamps.some((timestamp) => now - timestamp < windowMs)) this.attempts.delete(entry);
      }
    }
  }
}
