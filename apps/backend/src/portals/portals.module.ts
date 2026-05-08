import { Module } from "@nestjs/common";
import { PortalsController } from "./portals.controller";

@Module({
  controllers: [PortalsController]
})
export class PortalsModule {}
