import { Module } from "@nestjs/common";
import { BranchesController, DepartmentBranchController, DepartmentsController } from "./department-branch.controller";
import { DepartmentBranchService } from "./department-branch.service";

@Module({
  controllers: [DepartmentBranchController, DepartmentsController, BranchesController],
  providers: [DepartmentBranchService]
})
export class DepartmentBranchModule {}
