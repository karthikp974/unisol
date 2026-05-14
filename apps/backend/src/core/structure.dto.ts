import { ProgramDurationUnit } from "@prisma/client";
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { PaginationQueryDto } from "../common/pagination.dto";

export class CreateCampusDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  groupId!: string;
}

export class UpdateCampusDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  groupId?: string;
}

export class CreateProgramDto {
  @IsString()
  campusId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationValue!: number;

  @IsOptional()
  @IsEnum(ProgramDurationUnit)
  durationUnit: ProgramDurationUnit = ProgramDurationUnit.YEAR;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesters!: number;
}

export class UpdateProgramDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationValue?: number;

  @IsOptional()
  @IsEnum(ProgramDurationUnit)
  durationUnit?: ProgramDurationUnit;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesters?: number;
}

export class CreateBranchDto {
  @IsString()
  programId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  durationYears?: number;
}

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  durationYears?: number;
}

export class CreateBatchDto {
  @IsString()
  branchId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  startYear!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2001)
  endYear!: number;
}

export class UpdateBatchDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  startYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2001)
  endYear?: number;
}

export class CreateClassDto {
  @IsString()
  batchId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  yearNumber!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterNumber!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  label!: string;
}

export class UpdateClassDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  yearNumber?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterNumber?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  label?: string;
}

export class CreateSectionDto {
  @IsString()
  classId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;
}

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;
}

export class CreateSubjectDto {
  @IsString()
  branchId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterNumber!: number;
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semesterNumber?: number;
}

export class GenerateBatchClassesDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  sectionNames?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sectionCapacity?: number;
}

export class ScopedStructureQueryDto extends PaginationQueryDto {
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
  subjectId?: string;
}
