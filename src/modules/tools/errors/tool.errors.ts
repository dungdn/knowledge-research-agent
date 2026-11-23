export class ToolError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'TOOL_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ToolError';
  }
}

export class ToolNotFoundError extends ToolError {
  constructor(toolName: string) {
    super(`Tool '${toolName}' is not registered in the tool registry`, 'TOOL_NOT_FOUND', { toolName });
    this.name = 'ToolNotFoundError';
  }
}

export class ToolArgumentValidationError extends ToolError {
  constructor(toolName: string, validationErrors: unknown) {
    super(
      `Arguments provided to tool '${toolName}' failed schema validation`,
      'TOOL_ARGUMENT_VALIDATION_ERROR',
      validationErrors,
    );
    this.name = 'ToolArgumentValidationError';
  }
}

export class ToolExecutionError extends ToolError {
  constructor(toolName: string, originalError: unknown) {
    const message = originalError instanceof Error ? originalError.message : String(originalError);
    super(
      `Execution failed in tool '${toolName}': ${message}`,
      'TOOL_EXECUTION_ERROR',
      { originalError },
    );
    this.name = 'ToolExecutionError';
  }
}

export class ToolTimeoutError extends ToolError {
  constructor(toolName: string, timeoutMs: number) {
    super(
      `Tool '${toolName}' exceeded timeout limit of ${timeoutMs}ms`,
      'TOOL_TIMEOUT',
      { toolName, timeoutMs },
    );
    this.name = 'ToolTimeoutError';
  }
}

export class ToolPolicyDeniedError extends ToolError {
  constructor(toolName: string, reason: string) {
    super(
      `Execution of tool '${toolName}' was denied by policy: ${reason}`,
      'TOOL_POLICY_DENIED',
      { toolName, reason },
    );
    this.name = 'ToolPolicyDeniedError';
  }
}
