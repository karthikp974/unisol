import { Controller, Get, UseGuards } from "@nestjs/common";
import { PermissionAction } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequiresPermission } from "../permissions/requires-permission.decorator";

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller("portals")
export class PortalsController {
  @Get("admin")
  @RequiresPermission(PermissionAction.VIEW_ADMIN_PORTAL)
  admin(@CurrentUser() user: AuthUser) {
    return { portal: "ADMIN", userId: user.id, sections: ["Overview", "Academics", "Structure", "Finance", "Engage"] };
  }

  @Get("teacher")
  @RequiresPermission(PermissionAction.VIEW_TEACHER_PORTAL)
  teacher(@CurrentUser() user: AuthUser) {
    return {
      portal: "TEACHER",
      userId: user.id,
      activeRoles: user.assignments.map((assignment) => ({
        role: assignment.role,
        scope: {
          campusGroupId: assignment.campusGroupId,
          campusId: assignment.campusId,
          programId: assignment.programId,
          branchId: assignment.branchId,
          batchId: assignment.batchId,
          classId: assignment.classId,
          sectionId: assignment.sectionId,
          subjectId: assignment.subjectId
        }
      }))
    };
  }

  @Get("student")
  @RequiresPermission(PermissionAction.VIEW_STUDENT_PORTAL)
  student(@CurrentUser() user: AuthUser) {
    return { portal: "STUDENT", userId: user.id, sections: ["Attendance", "Fees", "Applications", "Marks"] };
  }

  @Get("database")
  @RequiresPermission(PermissionAction.VIEW_DB_PORTAL)
  database(@CurrentUser() user: AuthUser) {
    return { portal: "DATABASE", userId: user.id, mode: "read-only-first", tablesVisible: true };
  }
}
