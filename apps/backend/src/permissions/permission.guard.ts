import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthUser, ScopeRef } from "../auth/auth.types";
import { PermissionsService } from "./permissions.service";
import { REQUIRED_PERMISSION_KEY, RequiredPermissionMetadata } from "./requires-permission.decorator";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const metadata = this.reflector.getAllAndOverride<RequiredPermissionMetadata>(REQUIRED_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user: AuthUser;
      query: ScopeRef;
      body: ScopeRef & { scope?: ScopeRef };
    }>();
    this.applyImplicitCampusScope(request);

    const scope = request.body?.scope ?? (this.hasScopeFields(request.body) ? request.body : request.query);
    const decision = this.permissions.can(request.user, {
      action: metadata.action,
      scope
    });

    if (!decision.allowed) {
      throw new ForbiddenException(decision.reason);
    }

    return true;
  }

  private applyImplicitCampusScope(request: { user: AuthUser; query: ScopeRef }) {
    if (!request.query) {
      request.query = {};
    }
    if (request.user.campusId && !request.query.campusId) {
      request.query.campusId = request.user.campusId;
    }
    if (request.user.campusGroupId && !request.query.campusGroupId) {
      request.query.campusGroupId = request.user.campusGroupId;
    }
  }

  private hasScopeFields(scope?: ScopeRef): boolean {
    return Boolean(
      scope?.campusGroupId ||
        scope?.campusId ||
        scope?.programId ||
        scope?.branchId ||
        scope?.batchId ||
        scope?.classId ||
        scope?.sectionId ||
        scope?.subjectId
    );
  }
}
