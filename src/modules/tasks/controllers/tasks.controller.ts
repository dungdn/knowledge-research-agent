import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TasksService } from '../services/tasks.service';
import {
  TaskEntity,
  CreateTaskInput,
  QueryTasksInput,
  PaginatedResult,
} from '../interfaces/task.types';
import { AgentEvent } from '../../agent/interfaces/agent-event.types';
import { ResearchReport } from '../../research/interfaces/research-report.types';

@ApiTags('tasks')
@Controller('api/v1/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create and optionally execute a research task',
    description:
      'Creates a new research task entity, decomposes it via the Agent Planner, and executes it through the self-healing research workflow.',
  })
  @ApiResponse({
    status: 201,
    description: 'Task successfully created and executed (or queued).',
  })
  @ApiResponse({ status: 400, description: 'Invalid input parameters.' })
  async createTask(@Body() input: CreateTaskInput): Promise<TaskEntity> {
    return this.tasksService.createTask(input);
  }

  @Get()
  @ApiOperation({
    summary: 'List tasks with pagination and status filtering',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['queued', 'running', 'completed', 'failed', 'cancelled'] })
  @ApiQuery({ name: 'search', required: false, description: 'Text search within task goal' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Paginated list of tasks.' })
  async listTasks(
    @Query() query: QueryTasksInput,
  ): Promise<PaginatedResult<TaskEntity>> {
    return this.tasksService.listTasks(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details by ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task details with current plan and state.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async getTask(@Param('id') id: string): Promise<TaskEntity> {
    return this.tasksService.getTask(id);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Get audit events and telemetry timeline for a task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Chronological list of agent events.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async getTaskEvents(@Param('id') id: string): Promise<AgentEvent[]> {
    return this.tasksService.getTaskEvents(id);
  }

  @Get(':id/report')
  @ApiOperation({ summary: 'Get synthesized research report and rendered Markdown' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Synthesized research report artifact.' })
  @ApiResponse({ status: 404, description: 'Task not found or report not ready.' })
  async getTaskReport(
    @Param('id') id: string,
  ): Promise<{ report: ResearchReport; markdown: string }> {
    return this.tasksService.getTaskReport(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an active or queued task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task cancelled successfully.' })
  @ApiResponse({ status: 400, description: 'Cannot cancel task in its current state.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async cancelTask(@Param('id') id: string): Promise<TaskEntity> {
    return this.tasksService.cancelTask(id);
  }
}
