import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JWT_SECRET } from './jwt-secret';

const SEEDED_EMAIL = 'admin@umbral.local';
const SEEDED_PASSWORD = 'UmbralAdmin123!';

describe('AuthModule', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '15m' } })],
      controllers: [AuthController],
      providers: [AuthService],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('logs in the seeded admin operator with valid credentials', async () => {
    const result = await controller.login({ email: SEEDED_EMAIL, password: SEEDED_PASSWORD });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.operator.email).toBe(SEEDED_EMAIL);
    expect(result.operator.role).toBe('admin');
  });

  it('rejects an invalid password', async () => {
    await expect(
      controller.login({ email: SEEDED_EMAIL, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unknown email', async () => {
    await expect(
      controller.login({ email: 'nobody@umbral.local', password: 'whatever' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rotates the refresh token and revokes the previous one', async () => {
    const login = await controller.login({ email: SEEDED_EMAIL, password: SEEDED_PASSWORD });

    const refreshed = await controller.refresh({ refreshToken: login.refreshToken });
    expect(refreshed.accessToken).toBeTruthy();
    expect(refreshed.refreshToken).not.toBe(login.refreshToken);

    await expect(
      controller.refresh({ refreshToken: login.refreshToken }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout revokes the refresh token', async () => {
    const login = await controller.login({ email: SEEDED_EMAIL, password: SEEDED_PASSWORD });

    await controller.logout({ refreshToken: login.refreshToken });

    await expect(
      controller.refresh({ refreshToken: login.refreshToken }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('validateOperatorById returns null for an unknown operator', () => {
    expect(service.validateOperatorById('non-existent-id')).toBeNull();
  });
});
