import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { OperatorsController } from './operators.controller';
import { AuthService } from './auth.service';
import { JWT_SECRET } from './jwt-secret';

const SEEDED_EMAIL = 'admin@umbral.local';
const SEEDED_PASSWORD = 'UmbralAdmin123!';

describe('AuthModule', () => {
  let controller: AuthController;
  let operatorsController: OperatorsController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '15m' } })],
      controllers: [AuthController, OperatorsController],
      providers: [AuthService],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    operatorsController = module.get<OperatorsController>(OperatorsController);
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

  describe('OperatorsController', () => {
    it('lists the seeded admin operator', () => {
      const operators = operatorsController.list();
      expect(operators).toHaveLength(1);
      expect(operators[0]!.email).toBe(SEEDED_EMAIL);
    });

    it('creates a new operator and it can immediately log in', async () => {
      const created = await operatorsController.create({
        fullName: 'Guardia Uno',
        email: 'guardia1@umbral.local',
        password: 'GuardiaPass123!',
        role: 'guardia',
        siteId: 'site-default',
      });

      expect(created.role).toBe('guardia');
      expect(created.status).toBe('active');

      const login = await controller.login({
        email: 'guardia1@umbral.local',
        password: 'GuardiaPass123!',
      });
      expect(login.operator.role).toBe('guardia');
    });

    it('rejects creating an operator with a duplicate email', async () => {
      await expect(
        operatorsController.create({
          fullName: 'Otro Admin',
          email: SEEDED_EMAIL,
          password: 'AnotherPass123!',
          role: 'admin',
          siteId: 'site-default',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('disables an operator, who can no longer log in', async () => {
      const created = await operatorsController.create({
        fullName: 'Guardia Dos',
        email: 'guardia2@umbral.local',
        password: 'GuardiaPass123!',
        role: 'guardia',
        siteId: 'site-default',
      });

      const updated = operatorsController.update(created.id, { status: 'disabled' });
      expect(updated.status).toBe('disabled');

      await expect(
        controller.login({ email: 'guardia2@umbral.local', password: 'GuardiaPass123!' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws NotFoundException when updating an unknown operator', () => {
      expect(() => operatorsController.update('unknown-id', { role: 'admin' })).toThrow(
        NotFoundException,
      );
    });
  });
});
