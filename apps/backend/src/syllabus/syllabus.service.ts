import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, StructureStatus } from "@prisma/client";
import { toPagination } from "../common/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSyllabusDto, SyllabusSearchQueryDto, SyllabusUnitDto, UpdateSyllabusDto } from "./syllabus.dto";

@Injectable()
export class SyllabusService {
  constructor(private readonly prisma: PrismaService) {}

  async searchSubjects(query: SyllabusSearchQueryDto) {
    const pagination = toPagination(query);
    const where: Prisma.SubjectWhereInput = {
      status: StructureStatus.ACTIVE,
      isArchived: false,
      ...(query.search
        ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { code: { contains: query.search, mode: "insensitive" } }] }
        : {})
    };
    const [items, total] = await Promise.all([
      this.prisma.subject.findMany({ where, orderBy: { code: "asc" }, skip: pagination.skip, take: pagination.take }),
      this.prisma.subject.count({ where })
    ]);
    return { items: items.map((subject) => ({ id: subject.id, subjectName: subject.name, subjectCode: subject.code })), total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async search(query: SyllabusSearchQueryDto) {
    const pagination = toPagination(query);
    const where: Prisma.SyllabusWhereInput = {
      isArchived: false,
      subjectId: query.subjectId,
      subject: {
        status: StructureStatus.ACTIVE,
        isArchived: false,
        ...(query.search
          ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { code: { contains: query.search, mode: "insensitive" } }] }
          : {})
      }
    };
    const [items, total] = await Promise.all([
      this.prisma.syllabus.findMany({ where, include: this.include(), orderBy: { updatedAt: "desc" }, skip: pagination.skip, take: pagination.take }),
      this.prisma.syllabus.count({ where })
    ]);
    return { items: items.map((item) => this.response(item)), total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async create(dto: CreateSyllabusDto) {
    await this.ensureSubject(dto.subjectId);
    const units = this.normalizeUnits(dto.units);
    if (!units.length) throw new BadRequestException("Add at least one syllabus unit.");
    const existing = await this.prisma.syllabus.findFirst({ where: { subjectId: dto.subjectId, isArchived: false } });
    if (existing) throw new ConflictException("Syllabus already exists for this subject.");

    const created = await this.prisma.syllabus.create({
      data: {
        subjectId: dto.subjectId,
        units: { create: units.map((unit, index) => ({ unitTitle: unit.unitTitle, unitOrder: unit.unitOrder ?? index + 1 })) }
      },
      include: this.include()
    });
    await this.audit("CREATE_SYLLABUS", "Syllabus", created.id, { subjectId: created.subjectId, units: created.units.length });
    return this.response(created);
  }

  async update(id: string, dto: UpdateSyllabusDto) {
    await this.ensureSyllabus(id);
    const units = this.normalizeUnits(dto.units);
    if (!units.length) throw new BadRequestException("Add at least one syllabus unit.");

    const updated = await this.prisma.$transaction(async (tx) => {
      const keepIds = units.map((unit) => unit.id).filter(Boolean) as string[];
      await tx.syllabusUnit.updateMany({
        where: { syllabusId: id, id: { notIn: keepIds }, isArchived: false },
        data: { isArchived: true, archivedAt: new Date() }
      });

      for (const [index, unit] of units.entries()) {
        const unitOrder = unit.unitOrder ?? index + 1;
        if (unit.id) {
          await tx.syllabusUnit.update({
            where: { id: unit.id },
            data: { unitTitle: unit.unitTitle, unitOrder, isArchived: false, archivedAt: null }
          });
        } else {
          await tx.syllabusUnit.create({ data: { syllabusId: id, unitTitle: unit.unitTitle, unitOrder } });
        }
      }

      return tx.syllabus.findUniqueOrThrow({ where: { id }, include: this.include() });
    });
    await this.audit("UPDATE_SYLLABUS", "Syllabus", updated.id, { subjectId: updated.subjectId, units: updated.units.length });
    return this.response(updated);
  }

  async archive(id: string) {
    await this.ensureSyllabus(id);
    const archivedAt = new Date();
    const archived = await this.prisma.$transaction(async (tx) => {
      await tx.syllabusUnit.updateMany({ where: { syllabusId: id, isArchived: false }, data: { isArchived: true, archivedAt } });
      return tx.syllabus.update({ where: { id }, data: { isArchived: true, archivedAt }, include: this.include(true) });
    });
    await this.audit("ARCHIVE_SYLLABUS", "Syllabus", archived.id, { subjectId: archived.subjectId });
    return this.response(archived);
  }

  private include(includeArchivedUnits = false) {
    return {
      subject: true,
      units: {
        where: includeArchivedUnits ? {} : { isArchived: false },
        orderBy: { unitOrder: "asc" as const }
      }
    };
  }

  private async ensureSubject(id: string) {
    const subject = await this.prisma.subject.findFirst({ where: { id, status: StructureStatus.ACTIVE, isArchived: false } });
    if (!subject) throw new NotFoundException("Subject not found.");
    return subject;
  }

  private async ensureSyllabus(id: string) {
    const syllabus = await this.prisma.syllabus.findFirst({ where: { id, isArchived: false } });
    if (!syllabus) throw new NotFoundException("Syllabus not found.");
    return syllabus;
  }

  private normalizeUnits(units: SyllabusUnitDto[]) {
    return units.filter((unit) => unit.unitTitle.trim()).map((unit) => ({ ...unit, unitTitle: unit.unitTitle.trim().replace(/\s+/g, " ") }));
  }

  private response(item: Prisma.SyllabusGetPayload<{ include: ReturnType<SyllabusService["include"]> }>) {
    return {
      id: item.id,
      subjectId: item.subjectId,
      subjectName: item.subject.name,
      subjectCode: item.subject.code,
      isArchived: item.isArchived,
      archivedAt: item.archivedAt,
      units: item.units.map((unit) => ({
        id: unit.id,
        syllabusId: unit.syllabusId,
        unitTitle: unit.unitTitle,
        unitOrder: unit.unitOrder,
        isArchived: unit.isArchived,
        archivedAt: unit.archivedAt
      }))
    };
  }

  private async audit(action: string, entity: string, entityId?: string, metadata?: Prisma.InputJsonObject) {
    await this.prisma.auditLog.create({ data: { action, entity, entityId, metadata } });
  }
}
