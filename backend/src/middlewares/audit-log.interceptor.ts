import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { AUDIT_ACTION_KEY } from '../auth/decorators/audit-log.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.get<string>(AUDIT_ACTION_KEY, context.getHandler());
    
    // If route doesn't have the AuditLogAction decorator, proceed normally
    if (!action) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (responseBody) => {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Skip logging if there is no authenticated user context
        if (!user) return;

        const ip = request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress || 'unknown';
        const ipAddress = Array.isArray(ip) ? ip[0] : ip;

        // Strip out sensitive fields (like password fields) from request details if logging request body
        const sanitize = (data: any) => {
          if (!data) return data;
          const sanitized = { ...data };
          const sensitiveKeys = ['password', 'passwordHash', 'token', 'accessToken'];
          for (const key of sensitiveKeys) {
            if (key in sanitized) delete sanitized[key];
          }
          return sanitized;
        };

        // Determine details: either response body summary or request body payload
        const details = responseBody ? sanitize(responseBody) : sanitize(request.body);

        try {
          // Write directly to the AuditLog database table
          await this.prisma.auditLog.create({
            data: {
              userId: user.id,
              action,
              details: JSON.parse(JSON.stringify(details)), // Ensure it matches JSONB type
              ipAddress,
            },
          });
          console.log(`[AuditLog] Logged action "${action}" performed by user ${user.username}`);
        } catch (error) {
          // Prevent logging failures from failing the main request flow
          console.error('[AuditLog] Failed to write audit log entry:', error);
        }
      }),
    );
  }
}
