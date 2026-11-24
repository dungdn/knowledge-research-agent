import { Module } from '@nestjs/common';
import { TasksController } from './controllers/tasks.controller';
import { TasksService } from './services/tasks.service';
import {
  TASK_REPOSITORY_TOKEN,
  EVENT_REPOSITORY_TOKEN,
} from './interfaces/task-repository.port';
import { InMemoryTaskRepository } from './repositories/in-memory-task.repository';
import { InMemoryEventRepository } from './repositories/in-memory-event.repository';
import { ResearchModule } from '../research/research.module';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [ResearchModule, AgentModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    {
      provide: TASK_REPOSITORY_TOKEN,
      useClass: InMemoryTaskRepository,
    },
    {
      provide: EVENT_REPOSITORY_TOKEN,
      useClass: InMemoryEventRepository,
    },
  ],
  exports: [
    TasksService,
    TASK_REPOSITORY_TOKEN,
    EVENT_REPOSITORY_TOKEN,
  ],
})
export class TasksModule {}
