import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { PermissionAction } from "@prisma/client";
import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequiresPermission } from "../permissions/requires-permission.decorator";
import { FeeQueryDto, PaymentsRollSearchQueryDto, PreviewPhysicalFeeDto, RegisterPhysicalFeeDto } from "./finance.dto";
import { FinanceService } from "./finance.service";

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller("payments")
export class PaymentsController {
  constructor(private readonly finance: FinanceService) {}

  @Get("students/search-by-roll")
  @RequiresPermission(PermissionAction.VIEW_FEES)
  searchByRoll(@CurrentUser() user: AuthUser, @Query() query: PaymentsRollSearchQueryDto) {
    return this.finance.searchStudentsByRollForPayments(user, query);
  }

  @Get("students/:studentProfileId/context")
  @RequiresPermission(PermissionAction.VIEW_FEES)
  context(@CurrentUser() user: AuthUser, @Param("studentProfileId") studentProfileId: string, @Query("batchId") batchId?: string) {
    if (!batchId?.trim()) throw new BadRequestException("batchId is required.");
    return this.finance.getStudentPaymentContext(user, studentProfileId, batchId.trim());
  }

  @Get("students/:studentProfileId/payable-fees")
  @RequiresPermission(PermissionAction.VIEW_FEES)
  payableFees(@CurrentUser() user: AuthUser, @Param("studentProfileId") studentProfileId: string) {
    return this.finance.listPayableFeeLinesForStudent(user, studentProfileId);
  }

  @Post("preview")
  @RequiresPermission(PermissionAction.VIEW_FEES)
  preview(@CurrentUser() user: AuthUser, @Body() dto: PreviewPhysicalFeeDto) {
    return this.finance.previewPhysicalPayment(user, dto);
  }

  @Post("register")
  @RequiresPermission(PermissionAction.MARK_FEES)
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterPhysicalFeeDto) {
    return this.finance.registerPhysicalPayment(user, dto);
  }

  @Get("history")
  @RequiresPermission(PermissionAction.VIEW_FEES)
  history(@CurrentUser() user: AuthUser, @Query() query: FeeQueryDto) {
    return this.finance.listPayments(user, query);
  }
}
