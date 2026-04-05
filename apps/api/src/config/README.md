# ⚙️ Configuration & Environment

The `config` directory ensures the application is correctly initialized with the required environment variables and feature toggles.

## 🛡️ Feature: Type-Safe Validation

We use **Zod** to validate environment variables at the very beginning of the application lifecycle. If a required variable is missing or malformed, the application will fail fast with a descriptive error.

### Core Configuration Areas

- **Application**: Port, Host, and Environment (Dev/Prod/Test).
- **Security**: JWT secrets, expiry times, and Bcrypt salt rounds.
- **Infrastructure**: Database URLs and Redis connection strings.
- **Throttling**: Rate limiting TTL and Maximum request counts.
- **SMTP**: Email provider credentials and template paths.

---

## 📋 Environment Schema Example

```typescript
export const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  JWT_ACCESS_SECRET: z.string(),
  DATABASE_URL: z.string().url(),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});
```

---

## 🚀 Usage in Services

Configurations are accessible via the NestJS `ConfigService`, providing a clean way to inject settings.

```typescript
@Injectable()
export class JwtConfigService {
  constructor(private configService: ConfigService) {}

  get secret() {
    return this.configService.get<string>('JWT_ACCESS_SECRET');
  }

  get expiresIn() {
    return this.configService.get<string>('JWT_ACCESS_EXPIRES_IN');
  }
}
```
