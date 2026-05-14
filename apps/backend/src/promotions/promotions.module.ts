import { Module } from "@nestjs/common";
import { PromotionAliasController, PromotionsController } from "./promotions.controller";
import { PromotionsService } from "./promotions.service";

@Module({
  controllers: [PromotionsController, PromotionAliasController],
  providers: [PromotionsService]
})
export class PromotionsModule {}
