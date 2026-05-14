import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AnnouncementsModule } from "./announcements/announcements.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ApplicationsModule } from "./applications/applications.module";
import { AuditModule } from "./audit/audit.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { AuthModule } from "./auth/auth.module";
import { BatchesModule } from "./batches/batches.module";
import { ClassesSectionsModule } from "./classes-sections/classes-sections.module";
import { CoreModule } from "./core/core.module";
import { DatabaseBrowserModule } from "./database-browser/database-browser.module";
import { DepartmentBranchModule } from "./department-branch/department-branch.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { FinanceModule } from "./finance/finance.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { PortalsModule } from "./portals/portals.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PromotionsModule } from "./promotions/promotions.module";
import { QueuesModule } from "./queues/queues.module";
import { ReportsModule } from "./reports/reports.module";
import { ResultsModule } from "./results/results.module";
import { StudentsModule } from "./students/students.module";
import { SubjectsModule } from "./subjects/subjects.module";
import { SyllabusModule } from "./syllabus/syllabus.module";
import { TeamsModule } from "./teams/teams.module";
import { TeachersModule } from "./teachers/teachers.module";
import { TimetableModule } from "./timetable/timetable.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env", "../../.env"] }),
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
    AnnouncementsModule,
    ApplicationsModule,
    AuditModule,
    AttendanceModule,
    FinanceModule,
    FeedbackModule,
    AuthModule,
    BatchesModule,
    ClassesSectionsModule,
    CoreModule,
    DatabaseBrowserModule,
    DepartmentBranchModule,
    TeachersModule,
    TeamsModule,
    StudentsModule,
    SubjectsModule,
    SyllabusModule,
    TimetableModule,
    PromotionsModule,
    ReportsModule,
    ResultsModule,
    PortalsModule,
    QueuesModule
  ]
})
export class AppModule {}
