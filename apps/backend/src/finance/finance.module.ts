import { Module } from "@nestjs/common";
import { FeesController, FinanceController } from "./finance.controller";
import { PaymentsController } from "./payments.controller";
import { FinanceService } from "./finance.service";

@Module({
  controllers: [FinanceController, FeesController, PaymentsController],
  providers: [FinanceService]
})
export class FinanceModule {}
