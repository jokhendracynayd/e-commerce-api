import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    try {
      if (!payload || !payload.sub) {
        this.logger.warn('Invalid JWT payload structure');
        throw new UnauthorizedException('Invalid token');
      }

      const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        this.logger.warn(`User not found for ID: ${payload.sub}`);
        throw new UnauthorizedException('User not found');
      }

      // Check if user is blocked
      if (user.status === 'BLOCKED') {
        this.logger.warn(`Blocked user attempted to access: ${user.email}`);
        throw new UnauthorizedException(
          'Your account has been blocked. Please contact support.',
        );
      }

      const { password, refreshToken, ...result } = user;

      // Convert database fields to match DTO format if needed
      return {
        ...result,
        is_email_verified: user.isEmailVerified,
        is_phone_verified: user.isPhoneVerified,
      };
    } catch (error) {
      this.logger.error(`JWT validation error: ${error.message}`);
      throw error;
    }
  }
}
