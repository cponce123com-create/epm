import jwt from "jsonwebtoken";

// JWT_SECRET validation is handled in env-check.ts
const JWT_SECRET: string = process.env.JWT_SECRET!;

const JWT_ISSUER = process.env["FRONTEND_URL"] ?? "epm-api";
const JWT_AUDIENCE = "epm-api";
const JWT_EXPIRES_IN = "2h";
const REFRESH_GRACE_MS = 24 * 60 * 60 * 1000; // 24h para refrescar
const CLOCK_TOLERANCE_SEC = 60; // tolerancia de reloj

export interface JwtPayload {
  sub: number; // userId (RFC 7519 standard claim)
  email: string;
  role: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}

interface SignPayload {
  userId: number;
  email: string;
  role: string;
}

export function signToken(payload: SignPayload): string {
  return jwt.sign(
    {
      sub: payload.userId,
      email: payload.email,
      role: payload.role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );
}

/**
 * Verifica la firma del token ignorando expiración.
 * Útil para refresh tokens donde el token ya expiró pero la firma es válida.
 * Retorna null si la firma es inválida.
 */
export function verifyTokenSignature(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      clockTolerance: CLOCK_TOLERANCE_SEC,
      ignoreExpiration: true,
    }) as unknown as JwtPayload;

    // Verificar que iat no esté en el futuro
    if (
      payload.iat &&
      payload.iat > Math.floor(Date.now() / 1000) + CLOCK_TOLERANCE_SEC
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function verifyToken(token: string): JwtPayload {
  const payload = jwt.verify(token, JWT_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    clockTolerance: CLOCK_TOLERANCE_SEC,
    maxAge: JWT_EXPIRES_IN,
  }) as unknown as JwtPayload;

  // Verificar que iat no esté en el futuro (más allá de la tolerancia)
  if (
    payload.iat &&
    payload.iat > Math.floor(Date.now() / 1000) + CLOCK_TOLERANCE_SEC
  ) {
    throw new jwt.JsonWebTokenError("token issued in the future");
  }

  return payload;
}
