import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SEARCH_PROVIDER_TOKEN } from './interfaces/search-provider.port';
import { MockSearchAdapter } from './adapters/mock-search.adapter';
import { TavilySearchAdapter } from './adapters/tavily-search.adapter';
import { WebSearchTool } from './tools/web-search.tool';
import { PageReaderTool } from './tools/page-reader.tool';
import { ToolRegistry } from '../tools/registry/tool.registry';
import { ResearchSynthesizerService } from './services/research-synthesizer.service';
import { ResearchWorkflowService } from './services/research-workflow.service';
import { AgentModule } from '../agent/agent.module';

@Global()
@Module({
  imports: [AgentModule],
  providers: [
    MockSearchAdapter,
    TavilySearchAdapter,
    {
      provide: SEARCH_PROVIDER_TOKEN,
      useFactory: (configService: ConfigService) => {
        const tavilyKey = configService.get<string>('TAVILY_API_KEY');
        if (tavilyKey) {
          return new TavilySearchAdapter(configService);
        }
        return new MockSearchAdapter();
      },
      inject: [ConfigService],
    },
    WebSearchTool,
    PageReaderTool,
    ResearchSynthesizerService,
    ResearchWorkflowService,
  ],
  exports: [
    SEARCH_PROVIDER_TOKEN,
    WebSearchTool,
    PageReaderTool,
    ResearchSynthesizerService,
    ResearchWorkflowService,
  ],
})
export class ResearchModule implements OnModuleInit {
  private readonly logger = new Logger(ResearchModule.name);

  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly webSearchTool: WebSearchTool,
    private readonly pageReaderTool: PageReaderTool,
  ) {}

  onModuleInit(): void {
    this.toolRegistry.register(this.webSearchTool);
    this.toolRegistry.register(this.pageReaderTool);
    this.logger.log('Research tools registered in registry: web_search, page_reader');
  }
}
