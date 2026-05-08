import { SetMetadata } from "@nestjs/common";
import { PermissionAction } from "@prisma/client";

export const REQUIRED_PERMISSION_KEY = "requiredPermission";

export type RequiredPermissionMetadata = {
  action: PermissionAction;
};

export const RequiresPermission = (action: PermissionAction) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, { action } satisfies RequiredPermissionMetadata);
