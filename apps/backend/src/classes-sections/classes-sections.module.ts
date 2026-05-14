import { Module } from "@nestjs/common";
import { ClassesController, SectionsController } from "./classes-sections.controller";
import { ClassesSectionsService } from "./classes-sections.service";

@Module({
  controllers: [ClassesController, SectionsController],
  providers: [ClassesSectionsService]
})
export class ClassesSectionsModule {}
