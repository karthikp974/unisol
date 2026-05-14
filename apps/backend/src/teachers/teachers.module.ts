import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { TeachersController } from "./teachers.controller";
import { TeachersService } from "./teachers.service";

@Module({
  imports: [EmailModule],
  controllers: [TeachersController],
  providers: [TeachersService]
})
export class TeachersModule {}
