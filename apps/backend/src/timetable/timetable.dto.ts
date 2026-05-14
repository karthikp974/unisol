import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { PaginationQueryDto } from "../common/pagination.dto";

export class CreateTimetableSlotDto {
  @IsString()
  campusId!: string;

  @IsString()
  programId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  batchId!: string;

  @IsString()
  classId!: string;

  @IsString()
  sectionId!: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  teacherProfileId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number;

  @IsString()
  @MaxLength(10)
  startTime!: string;

  @IsString()
  @MaxLength(10)
  endTime!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  room?: string;
}

export class UpdateTimetableSlotDto {
  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  teacherProfileId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  startTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  room?: string;
}

export class TimetableQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  campusId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  teacherProfileId?: string;
}
