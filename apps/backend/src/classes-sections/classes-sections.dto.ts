import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { PaginationQueryDto } from "../common/pagination.dto";

export class SectionRowDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code!: string;
}

export class CreateClassDto {
  @IsString()
  campusId!: string;

  @IsString()
  departmentId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  code!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SectionRowDto)
  sections?: SectionRowDto[];
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SectionRowDto)
  sections?: SectionRowDto[];
}

export class CreateSectionsDto {
  @IsString()
  classId!: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SectionRowDto)
  sections!: SectionRowDto[];
}

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code?: string;
}

export class ClassSearchQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  campusId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class SectionSearchQueryDto extends ClassSearchQueryDto {
  @IsOptional()
  @IsString()
  classId?: string;
}

export class ExportQueryDto {
  @IsIn(["excel", "google-sheets", "pdf", "docx"])
  format!: "excel" | "google-sheets" | "pdf" | "docx";
}
