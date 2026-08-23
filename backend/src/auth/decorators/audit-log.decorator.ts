import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit_action';

// Custom decorator to specify the action name for audit logging
export const AuditLogAction = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);
