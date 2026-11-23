import { Injectable, Logger } from '@nestjs/common';
import { ToolCallDecision } from '../interfaces/agent-decision.types';
import { ToolObservation } from '../../tools/interfaces/tool.interface';

export interface ProgressCheckResult {
  hasProgress: boolean;
  reason?: string;
}

@Injectable()
export class NoProgressDetector {
  private readonly logger = new Logger(NoProgressDetector.name);
  private readonly maxConsecutiveDuplicateCalls = 2;
  private readonly maxConsecutiveErrors = 3;

  checkProgress(
    history: { decision: ToolCallDecision; observation?: ToolObservation }[],
  ): ProgressCheckResult {
    if (history.length === 0) {
      return { hasProgress: true };
    }

    // 1. Check for consecutive duplicate tool calls with exact same arguments
    if (history.length >= this.maxConsecutiveDuplicateCalls) {
      const recent = history.slice(-this.maxConsecutiveDuplicateCalls);
      const first = recent[0].decision;
      const allDuplicates = recent.every(
        (entry) =>
          entry.decision.toolName === first.toolName &&
          this.areArgumentsEqual(entry.decision.arguments, first.arguments),
      );

      if (allDuplicates) {
        const reason = `Detected repeated identical tool call '${first.toolName}' with arguments: ${JSON.stringify(
          first.arguments,
        )}`;
        this.logger.warn(`No-progress condition: ${reason}`);
        return { hasProgress: false, reason };
      }
    }

    // 2. Check for repeated consecutive tool failures
    if (history.length >= this.maxConsecutiveErrors) {
      const recent = history.slice(-this.maxConsecutiveErrors);
      const allErrors = recent.every(
        (entry) => entry.observation?.status === 'error',
      );

      if (allErrors) {
        const reason = `Exceeded maximum consecutive tool failures (${this.maxConsecutiveErrors} consecutive errors)`;
        this.logger.warn(`No-progress condition: ${reason}`);
        return { hasProgress: false, reason };
      }
    }

    return { hasProgress: true };
  }

  private areArgumentsEqual(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
  ): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }
}
