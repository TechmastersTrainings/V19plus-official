import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateContentDto } from '../content/dto/create-content.dto';
import { UpdateContentDto } from '../content/dto/update-content.dto';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.adminService.getDashboard();
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  updateSettings(@Body() body: Record<string, unknown>) {
    return this.adminService.updateSettings(body);
  }

  @Get('categories')
  listCategories() {
    return this.adminService.listCategories();
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  createCategory(@Body() body: { name: string; icon?: string; sortOrder?: number; isActive?: boolean }) {
    return this.adminService.createCategory(body);
  }

  @Put('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; icon?: string; sortOrder?: number; isActive?: boolean },
  ) {
    return this.adminService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.adminService.removeCategory(id);
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Put('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body('role') role: string) {
    return this.adminService.updateUserRole(id, role);
  }

  @Get('content')
  listContent() {
    return this.adminService.listContent();
  }

  @Post('content')
  @HttpCode(HttpStatus.CREATED)
  createContent(@Body() body: CreateContentDto) {
    return this.adminService.createContent(body);
  }

  @Put('content/:id')
  updateContent(@Param('id') id: string, @Body() body: UpdateContentDto) {
    return this.adminService.updateContent(id, body);
  }

  @Delete('content/:id')
  deleteContent(@Param('id') id: string) {
    return this.adminService.deleteContent(id);
  }
}
