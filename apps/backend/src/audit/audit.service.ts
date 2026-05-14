import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { toPagination } from "../common/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogQueryDto } from "./audit.dto";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditLogQueryDto) {
    const pagination = toPagination(query);
    const entities = this.entitiesFor(query);
    const where: Prisma.AuditLogWhereInput = {
      ...(entities.length === 1 ? { entity: entities[0] } : {}),
      ...(entities.length > 1 ? { entity: { in: entities } } : {}),
      ...(query.search
        ? {
            OR: [
              { action: { contains: query.search, mode: "insensitive" } },
              { entity: { contains: query.search, mode: "insensitive" } },
              { entityId: { contains: query.search, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return { items, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  private entitiesFor(query: AuditLogQueryDto) {
    return (query.entities ?? query.entity ?? "")
      .split(",")
      .map((entity) => entity.trim())
      .filter(Boolean);
  }
}
