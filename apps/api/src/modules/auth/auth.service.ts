import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import {
  Operator,
  OperatorId,
  makeOperatorId,
  makeSiteId,
  sha256Hex,
  randomHexBytes,
} from '@umbral/core';
import {
  LoginDto,
  RefreshDto,
  LogoutDto,
  CreateOperatorDto,
  UpdateOperatorDto,
} from './dto/auth.dto';
import { v4 as uuidv4 } from './uuid';

interface RefreshTokenRecord {
  id: string;
  operatorId: OperatorId;
  expiresAt: Date;
  revokedAt: Date | null;
}

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly operatorsById = new Map<OperatorId, Operator>();
  private readonly operatorIdByEmail = new Map<string, OperatorId>();
  private readonly refreshTokensByHash = new Map<string, RefreshTokenRecord>();

  constructor(private readonly jwtService: JwtService) {}

  async onModuleInit(): Promise<void> {
    if (this.operatorsById.size > 0) {
      return;
    }
    // Dev-only seed so the console/guard PWA login can be exercised without a
    // separate operator-provisioning flow (not yet built — Fase 1 scope).
    await this.registerOperator({
      fullName: 'Administrador UMBRAL',
      email: 'admin@umbral.local',
      password: 'UmbralAdmin123!',
      role: 'admin',
      siteId: 'site-default',
    });
  }

  private async registerOperator(input: {
    fullName: string;
    email: string;
    password: string;
    role: Operator['role'];
    siteId: string;
  }): Promise<Operator> {
    const passwordHash = await argon2.hash(input.password);
    const result = Operator.create({
      id: makeOperatorId(uuidv4()),
      siteId: makeSiteId(input.siteId),
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      role: input.role,
    });

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    const operator = result.value;
    this.operatorsById.set(operator.id, operator);
    this.operatorIdByEmail.set(operator.email, operator.id);
    return operator;
  }

  async login(dto: LoginDto) {
    const operatorId = this.operatorIdByEmail.get(dto.email.trim().toLowerCase());
    const operator = operatorId ? this.operatorsById.get(operatorId) : undefined;

    if (!operator) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!operator.canAuthenticate) {
      throw new UnauthorizedException('La cuenta de operador está deshabilitada');
    }

    const passwordValid = await argon2.verify(operator.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const updated = operator.withLoginRecorded();
    this.operatorsById.set(updated.id, updated);

    return this.issueTokens(updated);
  }

  async refresh(dto: RefreshDto) {
    const tokenHash = sha256Hex(dto.refreshToken);
    const record = this.refreshTokensByHash.get(tokenHash);

    if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    // Rotation: the token that was just used is immediately revoked.
    record.revokedAt = new Date();

    const operator = this.operatorsById.get(record.operatorId);
    if (!operator || !operator.canAuthenticate) {
      throw new UnauthorizedException('Operador no encontrado o deshabilitado');
    }

    return this.issueTokens(operator);
  }

  logout(dto: LogoutDto): { success: true } {
    const tokenHash = sha256Hex(dto.refreshToken);
    const record = this.refreshTokensByHash.get(tokenHash);
    if (record) {
      record.revokedAt = new Date();
    }
    return { success: true };
  }

  // ─── Operator management (admin-only, see OperatorsController) ───────────

  listOperators() {
    return Array.from(this.operatorsById.values()).map((op) => op.publicProps);
  }

  async createOperator(dto: CreateOperatorDto) {
    if (this.operatorIdByEmail.has(dto.email.trim().toLowerCase())) {
      throw new BadRequestException('Ya existe un operador con ese correo');
    }
    const operator = await this.registerOperator(dto);
    return operator.publicProps;
  }

  updateOperator(id: string, dto: UpdateOperatorDto) {
    const operator = this.operatorsById.get(makeOperatorId(id));
    if (!operator) {
      throw new NotFoundException(`Operador ${id} no encontrado`);
    }

    const result = Operator.create({
      ...operator.props,
      role: dto.role ?? operator.role,
      status: dto.status ?? operator.status,
    });
    if (result.isErr()) {
      throw new BadRequestException(result.error.message);
    }

    this.operatorsById.set(operator.id, result.value);
    return result.value.publicProps;
  }

  /** Used by JwtStrategy to re-check the operator is still active on every request. */
  validateOperatorById(operatorId: string) {
    const operator = this.operatorsById.get(makeOperatorId(operatorId));
    if (!operator || !operator.canAuthenticate) {
      return null;
    }
    return operator.publicProps;
  }

  private issueTokens(operator: Operator) {
    const accessToken = this.jwtService.sign({
      sub: operator.id,
      role: operator.role,
      siteId: operator.siteId,
    });

    const refreshToken = randomHexBytes(32);
    this.refreshTokensByHash.set(sha256Hex(refreshToken), {
      id: uuidv4(),
      operatorId: operator.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      revokedAt: null,
    });

    return {
      accessToken,
      refreshToken,
      operator: operator.publicProps,
    };
  }
}
