import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { PaginationQueryDto } from "../common/pagination.dto";

export class PromoteStudentsDto {
  @IsString()
  fromSectionId!: string;

  @IsString()
  toSectionId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  studentProfileIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class PromotionClassQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  batchId?: string;

  /** When set, only classes whose `semesterNumber` belongs to this academic year (1-based) are returned. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  academicYearIndex?: number;
}

export class PromotionSectionQueryDto extends PaginationQueryDto {
  @IsString()
  classId!: string;
}

export class PromotionStudentsQueryDto extends PaginationQueryDto {
  @IsString()
  classId!: string;

  @IsString()
  sectionId!: string;
}

export class NonPromotedReassignmentDto {
  @IsString()
  studentProfileId!: string;

  @IsString()
  toSectionId!: string;
}

export class PromoteSelectedStudentsDto {
  @IsString()
  fromClassId!: string;

  @IsString()
  fromSectionId!: string;

  /** Required when at least one student is promoted to the next academic year pair. Omit when every student is individually reassigned. */
  @ValidateIf((o: PromoteSelectedStudentsDto) => (o.promotedStudentProfileIds?.length ?? 0) > 0)
  @IsString()
  toSectionId?: string;

  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  promotedStudentProfileIds!: string[];

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => NonPromotedReassignmentDto)
  nonPromotedReassignments!: NonPromotedReassignmentDto[];

  @IsString()
  @MaxLength(120)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class PromotionHistoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  studentProfileId?: string;

  @IsOptional()
  @IsString()
  fromSectionId?: string;

  @IsOptional()
  @IsString()
  toSectionId?: string;
}

export class PromotionSemesterPairsQueryDto {
  @IsString()
  branchId!: string;
}
