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
      body: { scope?: ScopeRef };
    }>();

    const decision = this.permissions.can(request.user, {
      action: metadata.action,
      scope: request.body?.scope ?? request.query
    });

    if (!decision.allowed) {
      throw new ForbiddenException(decision.reason);
    }

    return true;
  }
}
