import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { ToolRegistry } from './registry/tool.registry';
import { ToolDispatcher } from './dispatcher/tool.dispatcher';
import { CalculatorTool } from './implementations/calculator.tool';
import { MockSearchTool } from './implementations/mock-search.tool';

@Global()
@Module({
  providers: [
    ToolRegistry,
    ToolDispatcher,
    CalculatorTool,
    MockSearchTool,
  ],
  exports: [
    ToolRegistry,
    ToolDispatcher,
    CalculatorTool,
    MockSearchTool,
  ],
})
export class ToolsModule implements OnModuleInit {
  private readonly logger = new Logger(ToolsModule.name);

  constructor(
    private readonly registry: ToolRegistry,
    private readonly calculatorTool: CalculatorTool,
    private readonly mockSearchTool: MockSearchTool,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.calculatorTool);
    this.registry.register(this.mockSearchTool);
    this.logger.log('Starter tools registered: calculator, mock_search');
  }
}
