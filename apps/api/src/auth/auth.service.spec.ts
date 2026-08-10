import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;

  const mockUser = {
    _id: new Types.ObjectId(),
    email: 'user@test.com',
    username: 'testuser',
    role: 'usuario',
    avatarUrl: 'http://avatar.url',
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      validatePassword: jest.fn(),
      findById: jest.fn(),
      updateRefreshToken: jest.fn().mockResolvedValue(undefined),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-token'),
    };

    configService = {
      get: jest.fn().mockReturnValue('mock-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserById', () => {
    it('should return user info without calling updateRefreshToken (web session protection)', async () => {
      usersService.findById = jest.fn().mockResolvedValue(mockUser as any);

      const result = await service.getUserById(mockUser._id.toString());

      expect(usersService.findById).toHaveBeenCalledWith(mockUser._id.toString());
      expect(usersService.updateRefreshToken).not.toHaveBeenCalled();
      expect(result).toEqual({
        _id: mockUser._id,
        email: mockUser.email,
        username: mockUser.username,
        avatarUrl: mockUser.avatarUrl,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findById = jest.fn().mockResolvedValue(null);

      await expect(service.getUserById('non-existent-id')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('validateUser', () => {
    it('should throw UnauthorizedException for blocked users', async () => {
      const blockedUser = { ...mockUser, role: 'bloqueado' };
      usersService.findByEmail = jest.fn().mockResolvedValue(blockedUser as any);
      usersService.validatePassword = jest.fn().mockResolvedValue(true);

      await expect(
        service.validateUser('user@test.com', 'password123')
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
