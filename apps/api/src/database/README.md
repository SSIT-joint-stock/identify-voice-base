# 🏗️ Infrastructure Layer

The `infra` directory handles the application's connection to external services and physical resources. It acts as the bridge between business logic and the outside world.

## 🗄️ Database (Prisma & PostgreSQL)

Leveraging Prisma for type-safe database interactions and performance.

### Features

- **Connection Pooling**: Managed database connections for high concurrency.
- **Auto-Generated Client**: Fully typed database models based on `schema.prisma`.
- **Relationship Management**: Efficient handling of complex data relationships and joins.
- **Migration System**: Safe and versioned database schema transformations.

### Usage Example: Prisma Service

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

---

## ⚡ Redis & BullMQ

Used for high-speed caching and background job management.

### Features

- **Asynchronous Processing**: Offload heavy tasks (like email) to worker threads.
- **Stateful Queues**: Queue persistence and retry logic via BullMQ.
- **Shared Cache**: Ultra-fast data retrieval for frequently accessed sessions or configuration.

### Usage Example: Injecting a Queue

```typescript
@Injectable()
export class JobsService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async addEmailJob(data: any) {
    await this.emailQueue.add('send-email', data);
  }
}
```
