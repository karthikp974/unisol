import { Global, Module } from "@nestjs/common";
import { PermissionGuard } from "./permission.guard";
import { PermissionsService } from "./permissions.service";

@Global()
@Module({
  providers: [PermissionsService, PermissionGuard],
  exports: [PermissionsService, PermissionGuard]
})
export class PermissionsModule {}
