import { Controller, Post, Body, UseGuards, Req, Get, Param, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './interfaces/notification.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '@prisma/client';
import { TestEmailDto } from './dto/test-email.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Test email notification (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test email notification sent successfully',
  })
  async testEmailNotification(@Body() testEmailDto: TestEmailDto, @Req() req) {
    const userId = req.user.id;
    await this.notificationsService.sendNotification(
      testEmailDto.type,
      userId,
      testEmailDto.data,
    );
    return { message: 'Test email notification sent successfully' };
  }

  @Get('types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all available notification types (Admin only)' })
  getNotificationTypes() {
    return Object.values(NotificationType);
  }
}