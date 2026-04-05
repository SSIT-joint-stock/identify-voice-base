export interface JWTTokenPayload<Payload> {
  payload: Payload;
  // (Issuer): Identifies the principal that issued the JWT.
  // example: "https://myapp.com" or "myapp-issuer"
  iss: string;
  // (Subject): Identifies the principal that is the subject of the JWT.
  // example: "user123" or "user@example.com"
  sub: string;
  // (Audience): Identifies the recipients that the JWT is intended for.
  // example: "myapp" or ["client1", "client2"]
  aud: string | string[];
  // (Expiration Time): Identifies the expiration time on or after which the JWT must not be accepted for processing.
  // example: 1640995200 (Unix timestamp in seconds, e.g., expires at 2022-01-01T00:00:00Z)
  exp?: number;
  // (Not Before): Identifies the time before which the JWT must not be accepted for processing.
  // example: 1640991600 (Unix timestamp in seconds, e.g., not valid before 2022-01-01T00:00:00Z)
  nbf?: number;
  // (Issued At): Identifies the time at which the JWT was issued.
  // example: 1640991600 (Unix timestamp in seconds, e.g., issued at 2022-01-01T00:00:00Z)
  iat?: number;
  // (JWT ID): Provides a unique identifier for the JWT.
  // example: "123e4567-e89b-12d3-a456-426614174000" (UUID)
  jti: string;
}
