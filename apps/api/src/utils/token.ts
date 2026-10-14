import jwt from 'jsonwebtoken';
import { Role } from '@pdi/shared';
import { config } from '../config/env.js';

export interface JwtPayload {
  userId: string;
  email: string;
  roles: Role[];
}

export function signToken(payload: JwtPayload, expiresIn: string | number = '7d'): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: expiresIn as unknown as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}

export const generateToken = signToken;

