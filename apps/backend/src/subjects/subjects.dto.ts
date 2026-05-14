import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";
import { PaginationQueryDto } from "../common/pagination.dto";

export class CreateSubjectModuleDto {
  @IsString()
  campusId!: string;

  @IsString()
  departmentId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  batchId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  semester!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  subjectName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  subjectCode!: string;
}

export class UpdateSubjectModuleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  subjectName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  subjectCode?: string;
}

export class SubjectSearchQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  campusId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semester?: number;
}
