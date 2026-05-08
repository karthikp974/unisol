import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { CoreModule } from "./core/core.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { PortalsModule } from "./portals/portals.module";
import { PrismaModule } from "./prisma/prisma.module";
import { QueuesModule } from "./queues/queues.module";
import { StudentsModule } from "./students/students.module";
import { TeachersModule } from "./teachers/teachers.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>("REDIS_HOST") ?? "localhost",
          port: config.get<number>("REDIS_PORT") ?? 6379
        }
      })
    }),
    PrismaModule,
    PermissionsModule,
    AuthModule,
    CoreModule,
    TeachersModule,
    StudentsModule,
    PortalsModule,
    QueuesModule
  ]
})
export class AppModule {}
