import { CalculatorTool } from './calculator.tool';
import { ToolError } from '../errors/tool.errors';

describe('CalculatorTool', () => {
  let tool: CalculatorTool;

  beforeEach(() => {
    tool = new CalculatorTool();
  });

  it('should perform basic arithmetic correctly', async () => {
    expect((await tool.execute({ expression: '2 + 3' })).result).toBe(5);
    expect((await tool.execute({ expression: '10 - 4' })).result).toBe(6);
    expect((await tool.execute({ expression: '6 * 7' })).result).toBe(42);
    expect((await tool.execute({ expression: '20 / 4' })).result).toBe(5);
    expect((await tool.execute({ expression: '11 % 4' })).result).toBe(3);
  });

  it('should handle operator precedence and parentheses', async () => {
    expect((await tool.execute({ expression: '2 + 3 * 4' })).result).toBe(14);
    expect((await tool.execute({ expression: '(2 + 3) * 4' })).result).toBe(20);
    expect((await tool.execute({ expression: '100 / (2 + 3) * 2' })).result).toBe(40);
  });

  it('should handle decimals and negative numbers', async () => {
    expect((await tool.execute({ expression: '2.5 * 4' })).result).toBe(10);
    expect((await tool.execute({ expression: '-5 + 12' })).result).toBe(7);
    expect((await tool.execute({ expression: '10 + -3' })).result).toBe(7);
  });

  it('should throw ToolError on division by zero', async () => {
    await expect(tool.execute({ expression: '10 / 0' })).rejects.toThrow(ToolError);
  });

  it('should throw ToolError on invalid or unsafe characters (code injection protection)', async () => {
    await expect(tool.execute({ expression: 'process.exit(1)' })).rejects.toThrow(ToolError);
    await expect(tool.execute({ expression: 'alert("hacked")' })).rejects.toThrow(ToolError);
    await expect(tool.execute({ expression: 'import("fs")' })).rejects.toThrow(ToolError);
  });

  it('should throw ToolError on mismatched parentheses', async () => {
    await expect(tool.execute({ expression: '(2 + 3' })).rejects.toThrow(ToolError);
  });
});
