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
  Res,
  UnauthorizedException,
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
  ApiCookieAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/guards/jwt-auth.guard';
import { Response } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
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

  @Public()
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
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    return this.authService.login(user, res, loginDto.rememberMe);
  }

  @Public()
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

  @Public()
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
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.authService.adminLogin(
      adminLoginDto.email,
      adminLoginDto.password,
      res,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/change-password')
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

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token successfully refreshed',
    type: TokenResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  @ApiCookieAuth('refresh_token')
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    // First try to get refresh token from cookie
    const refreshTokenFromCookie = req.cookies?.refresh_token;

    // If no cookie, fall back to body
    const refreshToken = refreshTokenFromCookie || refreshTokenDto.refreshToken;

    // If neither is provided, this will fail validation
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return this.authService.refreshToken(
      refreshTokenDto.userId,
      refreshToken,
      res,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out',
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  @ApiCookieAuth('refresh_token')
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponseDto> {
    return this.authService.logout(req.user.id, res);
  }

  @Get('me')
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

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/me')
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

  @Get('csrf-token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get CSRF token',
    description: 'Returns a new CSRF token for form submission protection',
  })
  @ApiOkResponse({
    description: 'CSRF token retrieved successfully',
    schema: {
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: {
          type: 'string',
          example: 'CSRF token generated successfully',
        },
      },
    },
  })
  async getCsrfToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // The token is already set in a cookie by the CSRF middleware
    return {
      statusCode: HttpStatus.OK,
      message: 'CSRF token generated successfully',
    };
  }
}
