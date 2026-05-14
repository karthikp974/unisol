import { IsDateString, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../common/pagination.dto";

export class ReportsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  campusId?: string;

  @IsOptional()
  @IsString()
  programId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
