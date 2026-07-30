import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { JWT_SECRET } from './jwt-secret';

interface JwtPayload {
  sub: string;
  role: string;
  siteId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  validate(payload: JwtPayload) {
    const operator = this.authService.validateOperatorById(payload.sub);
    if (!operator) {
      throw new UnauthorizedException('El operador ya no está activo');
    }
    return operator;
  }
}
