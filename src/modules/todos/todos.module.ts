import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersModule } from '../users/users.module';
import { TodoImageStorageService } from './services/todo-image-storage.service';
import { TodosController } from './todos.controller';
import { TodosRepository } from './todos.repository';
import { TodosService } from './todos.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), UsersModule],
  controllers: [TodosController],
  providers: [
    TodosRepository,
    TodosService,
    TodoImageStorageService,
    JwtAuthGuard,
  ],
  exports: [TodosService],
})
export class TodosModule {}
