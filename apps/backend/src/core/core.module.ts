import { Module } from "@nestjs/common";
import { CampusesController, CoreController } from "./core.controller";
import { CoreService } from "./core.service";

@Module({
  controllers: [CoreController, CampusesController],
  providers: [CoreService]
})
export class CoreModule {}
