import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserDocument> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const isValid = await this.usersService.validatePassword(user, password);
    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (user.role === 'bloqueado') {
      throw new UnauthorizedException('Tu cuenta está bloqueada o pendiente de aceptación');
    }
    return user;
  }

  async login(user: UserDocument) {
    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);
    return {
      ...tokens,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    };
  }

  async loginById(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return this.login(user);
  }

  async register(email: string, username: string, password: string) {
    const user = await this.usersService.create(email, username, password);
    if (user.role === 'bloqueado') {
      return {
        pending: true,
        message: 'Registro completado. Tu cuenta está pendiente de aceptación por un administrador.',
        user: {
          _id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
      };
    }
    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);
    return {
      ...tokens,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findByRefreshToken(userId, refreshToken);
    if (!user) {
      throw new UnauthorizedException('Refresh token inválido');
    }
    if (user.role === 'bloqueado') {
      throw new UnauthorizedException('Tu cuenta está bloqueada o pendiente de aceptación');
    }
    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  private async generateTokens(user: UserDocument) {
    const payload = { sub: user._id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'mypodcast-refresh-secret-dev',
        expiresIn: '30d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
