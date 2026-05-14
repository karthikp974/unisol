import { IsIn, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../common/pagination.dto";
import { DATABASE_TABLES } from "./database-browser.tables";

const tableKeys = DATABASE_TABLES.map((table) => table.key);

export class DatabaseRowsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(["asc", "desc"])
  order?: "asc" | "desc" = "desc";
}

export function isDatabaseTableKey(key: string) {
  return tableKeys.includes(key);
}
