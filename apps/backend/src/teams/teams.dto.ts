import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { PaginationQueryDto } from "../common/pagination.dto";

export class CreateTeamDto {
  @IsString()
  sectionId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  memberStudentProfileIds!: string[];

  @IsOptional()
  @IsString()
  leaderStudentProfileId?: string;
}

export class TeamQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  studentProfileId?: string;
}
