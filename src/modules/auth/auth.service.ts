import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { RegisterDto } from './dto/register.dto';
import {
  UserDto,
  AuthResponseDto,
  TokenResponseDto,
  LogoutResponseDto,
} from './dto/auth-response.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import * as bcrypt from 'bcrypt';
import { AppLogger } from '../../common/services/logger.service';
import { ErrorCode } from '../../common/constants/error-codes.enum';
import { Role } from '@prisma/client';
import { Response } from 'express';

// Define the UserStatus enum locally to match Prisma schema
enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

// Cookie configuration
const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' as const : 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/api/v1/auth/refresh', // Use the correct API path with v1 prefix
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('AuthService');
  }

  async validateUser(email: string, password: string): Promise<UserDto> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.logger.warn(`Login attempt with non-existent email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is allowed to login
    if (user.status === UserStatus.BLOCKED) {
      this.logger.warn(`Blocked user attempted to login: ${email}`);
      throw new UnauthorizedException(
        'Your account has been blocked. Please contact support.',
      );
    }

    // Update failed login attempts if password is wrong
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: {
            increment: 1,
          },
        },
      });

      // Check if we need to block the user due to too many failed attempts
      if (user.failedLoginAttempts >= 4) {
        // 5 attempts total (current + 4 previous)
        await this.prismaService.user.update({
          where: { id: user.id },
          data: { status: UserStatus.BLOCKED },
        });
        this.logger.warn(
          `User blocked due to too many failed login attempts: ${email}`,
        );
        throw new UnauthorizedException(
          'Account blocked due to too many failed login attempts. Please contact support.',
        );
      }

      this.logger.warn(`Failed login attempt for user: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login attempts and update last login
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        loginIp: this.getClientIp(),
      },
    });

    const { password: _, ...result } = user;
    return {
      ...result,
      is_email_verified: user.isEmailVerified,
      is_phone_verified: user.isPhoneVerified,
    } as UserDto;
  }

  async register(registerDto: RegisterDto): Promise<UserDto> {
    const { email, password, fullName } = registerDto;

    // Check if email exists
    const existingUserByEmail = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      this.logger.warn(`Registration attempt with existing email: ${email}`);
      throw new ConflictException(
        'Email already exists',
        ErrorCode.EMAIL_ALREADY_EXISTS,
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Split full name into first name and last name
    // If there's only one word, use it as firstName and leave lastName empty
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    try {
      // Create new user with basic fields
      const user = await this.prismaService.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          status: UserStatus.ACTIVE,
          signupIp: this.getClientIp(),
        },
      });

      // Create cart for new user
      await this.prismaService.cart.create({
        data: {
          userId: user.id,
        },
      });

      this.logger.log(`New user registered: ${email}`);

      const { password: _, ...result } = user;
      return {
        ...result,
        is_email_verified: user.isEmailVerified,
        is_phone_verified: user.isPhoneVerified,
      } as UserDto;
    } catch (error) {
      this.logger.error(`Failed to register user: ${error.message}`, error);
      throw new BadRequestException('Failed to register user');
    }
  }

  async login(user: UserDto, res?: Response, rememberMe?: boolean): Promise<AuthResponseDto> {
    const payload = { email: user.email, sub: user.id, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Store refresh token in database
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        refreshToken: await bcrypt.hash(refreshToken, 10),
        lastLoginAt: new Date(),
        loginIp: this.getClientIp(),
      },
    });

    this.logger.log(`User logged in: ${user.email}`);

    // Set refresh token as HTTP-only cookie if response object is provided
    if (res && typeof res.cookie === 'function') {
      const cookieOptions = {
        ...REFRESH_TOKEN_COOKIE_OPTIONS,
        maxAge: rememberMe
          ? 7 * 24 * 60 * 60 * 1000 // 7 days if rememberMe is true
          : 24 * 60 * 60 * 1000,    // 24 hours if rememberMe is false/undefined
      };
      
      res.cookie(
        REFRESH_TOKEN_COOKIE_NAME,
        refreshToken,
        cookieOptions
      );
    }

    return {
      accessToken,
      // Only include refresh token in response if not using HTTP-only cookies
      ...(res && typeof res.cookie === 'function' ? {} : { refreshToken }),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        is_email_verified: user.is_email_verified,
        is_phone_verified: user.is_phone_verified,
        status: user.status,
      },
    };
  }

  async refreshToken(
    userId: string,
    refreshToken: string,
    res?: Response
  ): Promise<TokenResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      this.logger.warn(`Invalid refresh token attempt for user ID: ${userId}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if user is allowed to refresh token
    if (user.status === UserStatus.BLOCKED) {
      this.logger.warn(
        `Blocked user attempted to refresh token: ${user.email}`,
      );
      throw new UnauthorizedException(
        'Your account has been blocked. Please contact support.',
      );
    }

    // Verify if the stored refresh token matches the one provided
    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!refreshTokenMatches) {
      this.logger.warn(
        `Invalid refresh token provided for user: ${user.email}`,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if refresh token is expired by manually validating it
    try {
      this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch (error) {
      this.logger.warn(`Expired refresh token for user: ${user.email}`);
      throw new UnauthorizedException('Refresh token expired');
    }

    // Generate new tokens
    const payload = { email: user.email, sub: user.id, role: user.role };
    
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
    });
    
    // Also generate a new refresh token (rotating refresh tokens)
    const newRefreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Update the refresh token in the database
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        refreshToken: await bcrypt.hash(newRefreshToken, 10),
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Token refreshed for user: ${user.email}`);
    
    // Set the new refresh token as HTTP-only cookie if response object is provided
    if (res && typeof res.cookie === 'function') {
      res.cookie(
        REFRESH_TOKEN_COOKIE_NAME,
        newRefreshToken,
        REFRESH_TOKEN_COOKIE_OPTIONS
      );
    }

    return {
      accessToken,
    };
  }

  async logout(userId: string, res?: Response): Promise<LogoutResponseDto> {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    
    // Clear the refresh token cookie if response object is provided
    if (res && typeof res.cookie === 'function') {
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
        path: '/api/v1/auth/refresh',
      });
    }

    this.logger.log(`User logged out: ${userId}`);
    return { success: true };
  }

  async registerAdmin(adminRegisterDto: AdminRegisterDto): Promise<UserDto> {
    const { email, password, fullName, phone, adminSecretKey } =
      adminRegisterDto;

    // Verify admin secret key
    const configuredSecretKey =
      this.configService.get<string>('ADMIN_SECRET_KEY');
    if (!configuredSecretKey || adminSecretKey !== configuredSecretKey) {
      this.logger.warn(
        `Admin registration attempt with invalid secret key from: ${email}`,
      );
      throw new ForbiddenException('Invalid admin secret key');
    }

    // Check if email exists
    const existingUserByEmail = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      this.logger.warn(
        `Admin registration attempt with existing email: ${email}`,
      );
      throw new ConflictException(
        'Email already exists',
        ErrorCode.EMAIL_ALREADY_EXISTS,
      );
    }

    // Check if phone exists (if provided)
    if (phone) {
      const existingUserByPhone = await this.prismaService.user.findUnique({
        where: { phone },
      });

      if (existingUserByPhone) {
        this.logger.warn(
          `Admin registration attempt with existing phone: ${phone}`,
        );
        throw new ConflictException(
          'Phone number already exists',
          ErrorCode.PHONE_ALREADY_EXISTS,
        );
      }
    }

    // Check if password meets complexity requirements
    this.validatePasswordStrength(password);

    // Hash password with a stronger hash (12 rounds for admin)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Split full name into first name and last name
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    try {
      // Create new admin user
      const user = await this.prismaService.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          status: UserStatus.ACTIVE,
          role: Role.ADMIN,
          isEmailVerified: true, // Auto-verify admin emails
          signupIp: this.getClientIp(),
          lastPasswordChange: new Date(),
        },
      });

      // Log the admin creation but don't include sensitive details
      this.logger.log(`New admin user registered: ${email}`);

      // Create cart for admin user (admins might need to test the cart functionality)
      await this.prismaService.cart.create({
        data: {
          userId: user.id,
        },
      });

      const { password: _, ...result } = user;
      return {
        ...result,
        is_email_verified: user.isEmailVerified,
        is_phone_verified: user.isPhoneVerified,
      } as UserDto;
    } catch (error) {
      this.logger.error(
        `Failed to register admin user: ${error.message}`,
        error,
      );
      throw new BadRequestException('Failed to register admin user');
    }
  }

  async adminLogin(email: string, password: string, res?: Response): Promise<AuthResponseDto> {
    // Add additional admin login attempt logging
    this.logger.log(`Admin login attempt for email: ${email}`);

    const user = await this.validateAdminUser(email, password);

    // Log successful admin login
    this.logger.log(`Admin login successful: ${email} (ID: ${user.id})`);

    // Pass response object to the login method - admins should have longer sessions by default
    return this.login(user, res, true);
  }

  async validateAdminUser(email: string, password: string): Promise<UserDto> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.logger.warn(`Admin login attempt with non-existent email: ${email}`);
      // Use same error message as regular login to prevent email enumeration
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is an admin
    if (user.role !== Role.ADMIN) {
      this.logger.warn(
        `Non-admin attempted to login through admin route: ${email}`,
      );
      throw new UnauthorizedException('Access denied');
    }

    // Check if user is allowed to login
    if (user.status === UserStatus.BLOCKED) {
      this.logger.warn(`Blocked admin attempted to login: ${email}`);
      throw new UnauthorizedException(
        'Your account has been blocked. Please contact support.',
      );
    }

    // Check for account inactivity (admins should use their accounts regularly)
    if (user.lastLoginAt) {
      const inactivityPeriod = this.configService.get<number>(
        'ADMIN_INACTIVITY_DAYS',
        30,
      );
      const lastActiveDate = new Date(user.lastLoginAt);
      const inactivityThreshold = new Date();
      inactivityThreshold.setDate(
        inactivityThreshold.getDate() - inactivityPeriod,
      );

      if (lastActiveDate < inactivityThreshold) {
        this.logger.warn(
          `Admin account inactive for over ${inactivityPeriod} days: ${email}`,
        );
        await this.prismaService.user.update({
          where: { id: user.id },
          data: { status: UserStatus.BLOCKED },
        });
        throw new UnauthorizedException(
          'Account blocked due to inactivity. Please contact support.',
        );
      }
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: {
            increment: 1,
          },
        },
      });

      // Stricter limits for admin accounts - only 3 attempts allowed
      if (user.failedLoginAttempts >= 2) {
        // 3 attempts total (current + 2 previous)
        await this.prismaService.user.update({
          where: { id: user.id },
          data: { status: UserStatus.BLOCKED },
        });
        this.logger.warn(
          `Admin user blocked due to too many failed login attempts: ${email}`,
        );
        throw new UnauthorizedException(
          'Account blocked due to too many failed login attempts. Please contact support.',
        );
      }

      this.logger.warn(`Failed admin login attempt for user: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if password requires a change (enforce periodic password changes for admins)
    if (user.lastPasswordChange) {
      const passwordChangePeriod = this.configService.get<number>(
        'ADMIN_PASSWORD_CHANGE_DAYS',
        90,
      );
      const lastPasswordChange = new Date(user.lastPasswordChange);
      const passwordChangeThreshold = new Date();
      passwordChangeThreshold.setDate(
        passwordChangeThreshold.getDate() - passwordChangePeriod,
      );

      if (lastPasswordChange < passwordChangeThreshold) {
        // Don't block login, but add a flag to indicate password change is required
        // This can be handled by the front-end to redirect to password change page
        const { password: _, ...result } = user;
        return {
          ...result,
          is_email_verified: user.isEmailVerified,
          is_phone_verified: user.isPhoneVerified,
          password_change_required: true,
        } as UserDto;
      }
    }

    // Reset failed login attempts and update last login
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        loginIp: this.getClientIp(),
      },
    });

    const { password: _, ...result } = user;
    return {
      ...result,
      is_email_verified: user.isEmailVerified,
      is_phone_verified: user.isPhoneVerified,
    } as UserDto;
  }

  // Helper method to validate password strength
  private validatePasswordStrength(password: string): void {
    // Password must be at least 8 characters
    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    // Password must contain at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one uppercase letter',
      );
    }

    // Password must contain at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one lowercase letter',
      );
    }

    // Password must contain at least one number
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one number',
      );
    }

    // Password must contain at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one special character',
      );
    }
  }

  private getClientIp(): string {
    // In production, this would use Request object to get client IP
    // For now, return placeholder
    return '127.0.0.1';
  }

  async changeAdminPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ success: boolean }> {
    // Validate that new password and confirmation match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException(
        'New password and confirmation do not match',
      );
    }

    // Find the admin user
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify this is an admin user
    if (user.role !== Role.ADMIN) {
      this.logger.warn(
        `Non-admin attempted to use admin password change: ${user.email}`,
      );
      throw new ForbiddenException('Access denied - Admin privileges required');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      this.logger.warn(
        `Admin password change with invalid current password: ${user.email}`,
      );
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is the same as the current one
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Validate password strength
    this.validatePasswordStrength(newPassword);

    // Hash new password with a stronger hash (12 rounds for admin)
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        lastPasswordChange: new Date(),
      },
    });

    this.logger.log(`Admin password changed successfully: ${user.email}`);

    // Invalidate all existing sessions by removing refresh token
    // This forces the admin to log in again with the new password
    await this.prismaService.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { success: true };
  }
}
