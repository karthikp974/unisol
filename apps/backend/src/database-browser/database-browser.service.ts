import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { toPagination } from "../common/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";
import { DatabaseRowsQueryDto, isDatabaseTableKey } from "./database-browser.dto";
import { DATABASE_TABLE_MAP, DATABASE_TABLES, DatabaseTableDefinition } from "./database-browser.tables";

type CountRow = { count: bigint | number };
type DatabaseRow = Record<string, unknown>;

@Injectable()
export class DatabaseBrowserService {
  constructor(private readonly prisma: PrismaService) {}

  tables() {
    return {
      tables: DATABASE_TABLES.map((table) => ({
        key: table.key,
        label: table.label,
        columns: table.columns,
        searchColumns: table.searchColumns
      }))
    };
  }

  async rows(tableKey: string, query: DatabaseRowsQueryDto) {
    const table = this.getTable(tableKey);
    const pagination = toPagination(query);
    const search = query.search?.trim();
    const order = query.order === "asc" ? "ASC" : "DESC";
    const whereSql = search ? this.searchWhere(table) : "";
    const params = search ? Array(table.searchColumns.length).fill(`%${search}%`) : [];
    const orderColumn = this.quoteIdentifier(table.defaultSort);
    const selectedColumns = table.columns.map((column) => `t.${this.quoteIdentifier(column)}`).join(", ");

    const countRows = await this.prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*)::bigint AS count FROM ${this.quoteIdentifier(table.tableName)} t ${whereSql}`,
      ...params
    );
    const items = await this.prisma.$queryRawUnsafe<DatabaseRow[]>(
      `SELECT ${selectedColumns} FROM ${this.quoteIdentifier(table.tableName)} t ${whereSql} ORDER BY t.${orderColumn} ${order} LIMIT ${pagination.take} OFFSET ${pagination.skip}`,
      ...params
    );
    const total = Number(countRows[0]?.count ?? 0);
    return { table: { key: table.key, label: table.label, columns: table.columns }, items, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  private getTable(tableKey: string): DatabaseTableDefinition {
    if (!isDatabaseTableKey(tableKey)) throw new NotFoundException("Database table is not available in the browser.");
    const table = DATABASE_TABLE_MAP.get(tableKey);
    if (!table) throw new NotFoundException("Database table is not available in the browser.");
    if (!table.columns.includes(table.defaultSort)) throw new BadRequestException("Database browser table configuration is invalid.");
    return table;
  }

  private searchWhere(table: DatabaseTableDefinition) {
    if (table.searchColumns.length === 0) return "";
    return `WHERE ${table.searchColumns.map((column, index) => `t.${this.quoteIdentifier(column)}::text ILIKE $${index + 1}`).join(" OR ")}`;
  }

  private quoteIdentifier(identifier: string) {
    return `"${identifier.replace(/"/g, "\"\"")}"`;
  }
}
