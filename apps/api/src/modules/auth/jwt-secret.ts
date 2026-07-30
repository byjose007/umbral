/**
 * Falls back to a fixed dev secret so the API boots without extra setup.
 * Production deployments MUST set JWT_SECRET — this is enforced only by
 * ops discipline for now, there is no config-loading layer in this repo yet.
 */
export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me';
