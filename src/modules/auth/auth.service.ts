import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { UserDto, AuthResponseDto, TokenResponseDto } from './dto/auth-response.dto';
import * as bcrypt from 'bcrypt';
import { AppLogger } from '../../common/services/logger.service';
import { ErrorCode } from '../../common/constants/error-codes.enum';

// Define the UserStatus enum locally to match Prisma schema
enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

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
      throw new UnauthorizedException('Your account has been blocked. Please contact support.');
    }

    // Update failed login attempts if password is wrong
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await this.prismaService.user.update({
        where: { id: user.id },
        data: { 
          failedLoginAttempts: {
            increment: 1
          }
        }
      });

      // Check if we need to block the user due to too many failed attempts
      if (user.failedLoginAttempts >= 4) { // 5 attempts total (current + 4 previous)
        await this.prismaService.user.update({
          where: { id: user.id },
          data: { status: UserStatus.BLOCKED }
        });
        this.logger.warn(`User blocked due to too many failed login attempts: ${email}`);
        throw new UnauthorizedException('Account blocked due to too many failed login attempts. Please contact support.');
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
      }
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
      throw new ConflictException('Email already exists', ErrorCode.EMAIL_ALREADY_EXISTS);
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

      // Create wishlist for new user
      await this.prismaService.wishlist.create({
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

  async login(user: UserDto): Promise<AuthResponseDto> {
    const payload = { email: user.email, sub: user.id, role: user.role };
    
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m')
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

    return {
      accessToken,
      refreshToken,
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

  async refreshToken(userId: string, refreshToken: string): Promise<TokenResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      this.logger.warn(`Invalid refresh token attempt for user ID: ${userId}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if user is allowed to refresh token
    if (user.status === UserStatus.BLOCKED) {
      this.logger.warn(`Blocked user attempted to refresh token: ${user.email}`);
      throw new UnauthorizedException('Your account has been blocked. Please contact support.');
    }

    const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isRefreshTokenValid) {
      this.logger.warn(`Invalid refresh token for user: ${user.email}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    
    this.logger.log(`Token refreshed for user: ${user.email}`);

    return {
      accessToken: this.jwtService.sign(payload, {
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m')
      }),
    };
  }

  async logout(userId: string) {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    
    this.logger.log(`User logged out: ${userId}`);
    return { success: true };
  }

  private getClientIp(): string {
    // In production, this would use Request object to get client IP
    // For now, return placeholder
    return '127.0.0.1';
  }
} 