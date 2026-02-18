import { ShipmentStatus, VALID_STATUS_TRANSITIONS } from '@shipping/shared';
import { InvalidStatusTransitionException } from '../../../common/exceptions/app.exception';

/**
 * Validates shipment status transitions according to the state machine
 * defined in Phase 5: Domain & Data Design
 */
export class ShipmentStateMachine {
  /**
   * Check if a transition from currentStatus to newStatus is valid
   */
  static canTransition(currentStatus: ShipmentStatus, newStatus: ShipmentStatus): boolean {
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Assert that a transition is valid, throw exception if not
   */
  static assertCanTransition(currentStatus: ShipmentStatus, newStatus: ShipmentStatus): void {
    if (!this.canTransition(currentStatus, newStatus)) {
      throw new InvalidStatusTransitionException(currentStatus, newStatus);
    }
  }

  /**
   * Get all allowed next statuses from current status
   */
  static getAllowedTransitions(currentStatus: ShipmentStatus): ShipmentStatus[] {
    return VALID_STATUS_TRANSITIONS[currentStatus];
  }

  /**
   * Check if a status is terminal (no further transitions allowed)
   */
  static isTerminalStatus(status: ShipmentStatus): boolean {
    return VALID_STATUS_TRANSITIONS[status].length === 0;
  }
}
