import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { PaginationQueryDto } from "../common/pagination.dto";

export class SyllabusUnitDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  unitTitle!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitOrder?: number;
}

export class CreateSyllabusDto {
  @IsString()
  subjectId!: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SyllabusUnitDto)
  units!: SyllabusUnitDto[];
}

export class UpdateSyllabusDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SyllabusUnitDto)
  units!: SyllabusUnitDto[];
}

export class SyllabusSearchQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  subjectId?: string;
}
