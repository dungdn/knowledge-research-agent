import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool } from '../base/base.tool';
import { ToolMetadata } from '../interfaces/tool.interface';
import { ToolError } from '../errors/tool.errors';

const calculatorInputSchema = z.object({
  expression: z
    .string()
    .min(1)
    .describe('Mathematical expression to calculate, e.g. "12 * (3.5 + 4.5)"'),
});

export type CalculatorInput = z.infer<typeof calculatorInputSchema>;

export interface CalculatorOutput {
  expression: string;
  result: number;
}

@Injectable()
export class CalculatorTool extends BaseTool<CalculatorInput, CalculatorOutput> {
  readonly metadata: ToolMetadata = {
    name: 'calculator',
    description: 'Perform safe mathematical evaluations for arithmetic calculations (supports +, -, *, /, %, parentheses, decimal numbers).',
    timeoutMs: 5000,
    isSideEffecting: false,
  };

  readonly inputSchema = calculatorInputSchema;

  async execute(input: CalculatorInput): Promise<CalculatorOutput> {
    const expr = input.expression.trim();
    const result = this.evaluateArithmetic(expr);
    return {
      expression: expr,
      result,
    };
  }

  /**
   * Safe arithmetic evaluator using tokenization and recursive descent.
   * Completely avoids eval() or Function() to prevent remote code execution.
   */
  private evaluateArithmetic(expr: string): number {
    // Sanitize: only allow numbers, basic math operators, parentheses, decimal point and whitespace
    if (!/^[0-9+\-*/%().\s]+$/.test(expr)) {
      throw new ToolError(
        `Invalid characters in arithmetic expression: '${expr}'. Only digits and operators (+, -, *, /, %, parentheses) are allowed.`,
        'CALCULATOR_SYNTAX_ERROR',
      );
    }

    const tokens = expr.match(/\d+(\.\d+)?|[+\-*/%()]/g);
    if (!tokens || tokens.length === 0) {
      throw new ToolError('Empty arithmetic expression', 'CALCULATOR_SYNTAX_ERROR');
    }

    let pos = 0;

    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];

    const parsePrimary = (): number => {
      const token = consume();
      if (!token) throw new ToolError('Unexpected end of expression', 'CALCULATOR_SYNTAX_ERROR');

      if (token === '(') {
        const val = parseExpression();
        if (consume() !== ')') {
          throw new ToolError('Mismatched parentheses: missing closing ")"', 'CALCULATOR_SYNTAX_ERROR');
        }
        return val;
      }

      if (token === '-') {
        // Unary minus
        return -parsePrimary();
      }

      if (token === '+') {
        // Unary plus
        return parsePrimary();
      }

      const num = Number(token);
      if (isNaN(num)) {
        throw new ToolError(`Unexpected token: '${token}'`, 'CALCULATOR_SYNTAX_ERROR');
      }
      return num;
    };

    const parseFactor = (): number => {
      let val = parsePrimary();
      while (peek() === '*' || peek() === '/' || peek() === '%') {
        const op = consume();
        const right = parsePrimary();
        if (op === '*') val *= right;
        else if (op === '/') {
          if (right === 0) {
            throw new ToolError('Division by zero is undefined', 'CALCULATOR_MATH_ERROR');
          }
          val /= right;
        } else if (op === '%') {
          if (right === 0) {
            throw new ToolError('Modulo by zero is undefined', 'CALCULATOR_MATH_ERROR');
          }
          val %= right;
        }
      }
      return val;
    };

    const parseExpression = (): number => {
      let val = parseFactor();
      while (peek() === '+' || peek() === '-') {
        const op = consume();
        const right = parseFactor();
        if (op === '+') val += right;
        else if (op === '-') val -= right;
      }
      return val;
    };

    const result = parseExpression();
    if (pos < tokens.length) {
      throw new ToolError(`Unexpected token remaining: '${tokens[pos]}'`, 'CALCULATOR_SYNTAX_ERROR');
    }

    if (!isFinite(result)) {
      throw new ToolError('Calculation resulted in non-finite value', 'CALCULATOR_MATH_ERROR');
    }

    return result;
  }
}
