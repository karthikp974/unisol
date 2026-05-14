import { IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../common/pagination.dto";

export class AuditLogQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  entities?: string;
}
