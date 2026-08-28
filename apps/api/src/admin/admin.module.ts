import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [AdminController],
  providers: [RolesGuard],
})
export class AdminModule {}
