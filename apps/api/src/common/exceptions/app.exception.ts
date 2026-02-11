import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@shipping/shared';

/**
 * Custom exception for business rule violations.
 * Every error thrown from service layer should use this class.
 *
 * Usage:
 *   throw new AppException(ErrorCode.SHIPMENT_CANNOT_BE_CANCELLED, 422, 'Shipment is already delivered');
 */
export class AppException extends HttpException {
  constructor(
    code: ErrorCode | string,
    status: HttpStatus | number,
    message: string,
    details: Array<{ field: string; message: string }> = [],
  ) {
    super(
      {
        code,
        message,
        details,
      },
      status,
    );
  }
}

// ─────────────────────────────────────────
// Convenience factory methods
// ─────────────────────────────────────────

export class NotFoundException extends AppException {
  constructor(resource: string, id: string) {
    super(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND, `${resource} with id '${id}' does not exist`);
  }
}

export class ConflictException extends AppException {
  constructor(message: string) {
    super(ErrorCode.CONFLICT, HttpStatus.CONFLICT, message);
  }
}

export class ForbiddenException extends AppException {
  constructor(message = 'You do not have permission to perform this action') {
    super(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, message);
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = 'Authentication required') {
    super(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, message);
  }
}

export class InvalidStatusTransitionException extends AppException {
  constructor(from: string, to: string) {
    super(
      ErrorCode.INVALID_STATUS_TRANSITION,
      HttpStatus.UNPROCESSABLE_ENTITY,
      `Cannot transition shipment from '${from}' to '${to}'`,
    );
  }
}
