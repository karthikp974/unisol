import { Type } from "class-transformer";
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { ResultEntryStatus } from "@prisma/client";
import { PaginationQueryDto } from "../common/pagination.dto";

export class UpsertResultEntryDto {
  @IsString()
  studentProfileId!: string;

  @IsString()
  subjectId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  semesterNumber!: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  examType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  internals?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  externals?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(200)
  totalMarks?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  grade?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  credits?: number;

  @IsEnum(ResultEntryStatus)
  status!: ResultEntryStatus;
}

export class ResultsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  campusId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  studentProfileId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  semesterNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  examType?: string;

  @IsOptional()
  @IsEnum(ResultEntryStatus)
  status?: ResultEntryStatus;
}

export class ResultPdfImportDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  examType?: string;
}
