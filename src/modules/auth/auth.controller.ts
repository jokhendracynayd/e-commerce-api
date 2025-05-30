import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Req,
  Ip,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  TokenResponseDto,
  LogoutResponseDto,
  UserDto,
  RefreshTokenDto,
  AdminRegisterDto,
  AdminLoginDto,
  AdminPasswordChangeDto,
} from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user with email, password, and full name',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: UserDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<UserDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    return this.authService.login(user);
  }

  @Post('admin/register')
  @ApiOperation({ summary: 'Register a new admin user with secure key' })
  @ApiResponse({
    status: 201,
    description: 'Admin successfully registered',
    type: UserDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Email already exists' })
  @ApiForbiddenResponse({ description: 'Invalid admin secret key' })
  async registerAdmin(
    @Body() adminRegisterDto: AdminRegisterDto,
  ): Promise<UserDto> {
    return this.authService.registerAdmin(adminRegisterDto);
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({
    status: 200,
    description: 'Admin successfully logged in',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or not an admin',
  })
  @ApiBody({ type: AdminLoginDto })
  async adminLogin(
    @Body() adminLoginDto: AdminLoginDto,
  ): Promise<AuthResponseDto> {
    return this.authService.adminLogin(
      adminLoginDto.email,
      adminLoginDto.password,
    );
  }

  @Post('admin/change-password')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change admin password' })
  @ApiResponse({
    status: 200,
    description: 'Admin password successfully changed',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized or incorrect current password',
  })
  @ApiForbiddenResponse({ description: 'Forbidden - Not an admin' })
  @ApiBadRequestResponse({
    description: 'Invalid password format or passwords do not match',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: AdminPasswordChangeDto })
  async changeAdminPassword(
    @Body() passwordChangeDto: AdminPasswordChangeDto,
    @Req() req: any,
  ): Promise<{ success: boolean }> {
    return this.authService.changeAdminPassword(
      req.user.id,
      passwordChangeDto.currentPassword,
      passwordChangeDto.newPassword,
      passwordChangeDto.confirmPassword,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token successfully refreshed',
    type: TokenResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<TokenResponseDto> {
    return this.authService.refreshToken(
      refreshTokenDto.userId,
      refreshTokenDto.refreshToken,
    );
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out',
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  async logout(@Req() req: any): Promise<LogoutResponseDto> {
    return this.authService.logout(req.user.id);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile',
    type: UserDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  getProfile(@Req() req: any): UserDto {
    return req.user;
  }

  @Get('admin/me')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get current admin profile' })
  @ApiResponse({
    status: 200,
    description: 'Admin profile',
    type: UserDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Not an admin' })
  @ApiBearerAuth('JWT-auth')
  getAdminProfile(@Req() req: any): UserDto {
    return req.user;
  }
}
