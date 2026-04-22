import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTodoRequestDto } from './dto/create-todo.request.dto';
import { ListTodosQueryDto } from './dto/list-todos.query.dto';
import { PaginatedTodoResponseDto } from './dto/paginated-todo.response.dto';
import { TodoResponseDto } from './dto/todo-response.dto';
import { UpdateTodoRequestDto } from './dto/update-todo.request.dto';
import { TodosMapper } from './mappers/todos.mapper';
import {
  ALLOWED_TODO_IMAGE_MIME_TYPES,
  MAX_TODO_IMAGES,
  MAX_TODO_IMAGE_SIZE_BYTES,
  TodoUploadFile,
} from './services/todo-image-storage.service';
import { TodosService } from './todos.service';
import { TODOS_ROUTES } from './todos.routes';
import {
  ApiCreateCurrentUserTodoEndpoint,
  ApiDeleteCurrentUserTodoEndpoint,
  ApiDeleteCurrentUserTodoImageEndpoint,
  ApiGetCurrentUserTodoEndpoint,
  ApiListCurrentUserTodosEndpoint,
  ApiUpdateCurrentUserTodoEndpoint,
} from './todos.swagger';

const todoImagesInterceptor = FilesInterceptor('images', MAX_TODO_IMAGES, {
  limits: {
    files: MAX_TODO_IMAGES,
    fileSize: MAX_TODO_IMAGE_SIZE_BYTES,
  },
  fileFilter: (_request, file, callback) => {
    if (ALLOWED_TODO_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(
      new BadRequestException(
        'Only JPEG, PNG, and WebP todo images are supported.',
      ),
      false,
    );
  },
});

@ApiTags('Todos')
@Controller(TODOS_ROUTES.base)
@UseGuards(JwtAuthGuard)
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  @ApiListCurrentUserTodosEndpoint()
  async listCurrentUserTodos(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: ListTodosQueryDto,
  ): Promise<PaginatedTodoResponseDto> {
    const todos = await this.todosService.listCurrentUserTodos(
      user.userId,
      query,
    );

    return TodosMapper.toPaginatedTodoResponse(todos);
  }

  @Get(TODOS_ROUTES.byId)
  @ApiGetCurrentUserTodoEndpoint()
  async getCurrentUserTodo(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('todoId', ParseUUIDPipe) todoId: string,
  ): Promise<TodoResponseDto> {
    const todo = await this.todosService.getCurrentUserTodo(
      user.userId,
      todoId,
    );

    return TodosMapper.toTodoResponse(todo);
  }

  @Post()
  @UseInterceptors(todoImagesInterceptor)
  @ApiCreateCurrentUserTodoEndpoint()
  async createCurrentUserTodo(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateTodoRequestDto,
    @UploadedFiles() files: TodoUploadFile[] = [],
  ): Promise<TodoResponseDto> {
    const todo = await this.todosService.createCurrentUserTodo(
      user.userId,
      body,
      files,
    );

    return TodosMapper.toTodoResponse(todo);
  }

  @Patch(TODOS_ROUTES.byId)
  @UseInterceptors(todoImagesInterceptor)
  @ApiUpdateCurrentUserTodoEndpoint()
  async updateCurrentUserTodo(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('todoId', ParseUUIDPipe) todoId: string,
    @Body() body: UpdateTodoRequestDto,
    @UploadedFiles() files: TodoUploadFile[] = [],
  ): Promise<TodoResponseDto> {
    const todo = await this.todosService.updateCurrentUserTodo(
      user.userId,
      todoId,
      body,
      files,
    );

    return TodosMapper.toTodoResponse(todo);
  }

  @Delete(TODOS_ROUTES.byId)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteCurrentUserTodoEndpoint()
  async deleteCurrentUserTodo(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('todoId', ParseUUIDPipe) todoId: string,
  ): Promise<void> {
    await this.todosService.deleteCurrentUserTodo(user.userId, todoId);
  }

  @Delete(TODOS_ROUTES.imageById)
  @ApiDeleteCurrentUserTodoImageEndpoint()
  async deleteCurrentUserTodoImage(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('todoId', ParseUUIDPipe) todoId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ): Promise<TodoResponseDto> {
    const todo = await this.todosService.deleteCurrentUserTodoImage(
      user.userId,
      todoId,
      imageId,
    );

    return TodosMapper.toTodoResponse(todo);
  }
}
