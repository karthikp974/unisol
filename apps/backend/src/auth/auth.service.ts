import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthSessionStatus, PasswordResetTokenStatus, User, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser, JwtAccessPayload } from "./auth.types";
import { LoginDto } from "./login.dto";
import { ForgotPasswordDto, ResetPasswordDto } from "./password-recovery.dto";
import { RefreshTokenDto } from "./refresh-token.dto";
import { RequestContext } from "./request-context";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_DAYS = 30;
const PASSWORD_RESET_TTL_MINUTES = 15;
const PASSWORD_RESET_GENERIC_MESSAGE = "If the identifier exists, password reset instructions have been prepared.";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async login(dto: LoginDto, context: RequestContext = {}) {
    const user = await this.findUserByIdentifier(dto.identifier);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Invalid login credentials.");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid login credentials.");
    }

    const refreshToken = this.createRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = this.getRefreshExpiry();

    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        expiresAt
      }
    });

    const accessToken = await this.signAccessToken({
      sub: user.id,
      sid: session.id,
      type: user.type,
      campusId: user.campusId,
      campusGroupId: user.campus?.groupId
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: this.toAuthResponseUser(user, session.id)
    };
  }

  async refresh(dto: RefreshTokenDto, context: RequestContext = {}) {
    const oldRefreshTokenHash = this.hashToken(dto.refreshToken);
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: oldRefreshTokenHash },
      include: {
        user: {
          include: {
            campus: { include: { group: true } },
            teacherAssignments: {
              where: { isActive: true },
              include: { permissions: true }
            }
          }
        }
      }
    });

    if (
      !session ||
      session.status !== AuthSessionStatus.ACTIVE ||
      session.expiresAt <= new Date() ||
      session.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException("Refresh session is invalid or expired.");
    }

    const refreshToken = this.createRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = this.getRefreshExpiry();

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash,
        expiresAt,
        lastUsedAt: new Date(),
        userAgent: context.userAgent,
        ipAddress: context.ipAddress
      }
    });

    const accessToken = await this.signAccessToken({
      sub: session.user.id,
      sid: session.id,
      type: session.user.type,
      campusId: session.user.campusId,
      campusGroupId: session.user.campus?.groupId
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: this.toAuthResponseUser(session.user, session.id)
    };
  }

  async logout(dto: RefreshTokenDto) {
    const refreshTokenHash = this.hashToken(dto.refreshToken);

    await this.prisma.authSession.updateMany({
      where: {
        refreshTokenHash,
        status: AuthSessionStatus.ACTIVE
      },
      data: {
        status: AuthSessionStatus.REVOKED,
        revokedAt: new Date()
      }
    });

    return { ok: true };
  }

  async logoutCurrentSession(user: AuthUser) {
    await this.prisma.authSession.updateMany({
      where: {
        id: user.sessionId,
        userId: user.id,
        status: AuthSessionStatus.ACTIVE
      },
      data: {
        status: AuthSessionStatus.REVOKED,
        revokedAt: new Date()
      }
    });

    return { ok: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.findUserByIdentifier(dto.identifier);

    if (!user || user.status !== UserStatus.ACTIVE) {
      return { ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE };
    }

    const resetToken = randomBytes(48).toString("base64url");
    const tokenHash = this.hashToken(resetToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, status: PasswordResetTokenStatus.ACTIVE },
      data: { status: PasswordResetTokenStatus.EXPIRED }
    });

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt }
    });

    const response: { ok: true; message: string; devResetToken?: string } = {
      ok: true,
      message: PASSWORD_RESET_GENERIC_MESSAGE
    };

    if (process.env.NODE_ENV !== "production") {
      response.devResetToken = resetToken;
    }

    return response;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (
      !resetToken ||
      resetToken.status !== PasswordResetTokenStatus.ACTIVE ||
      resetToken.expiresAt <= new Date() ||
      resetToken.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException("Password reset token is invalid or expired.");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { status: PasswordResetTokenStatus.USED, usedAt: new Date() }
      }),
      this.prisma.authSession.updateMany({
        where: { userId: resetToken.userId, status: AuthSessionStatus.ACTIVE },
        data: { status: AuthSessionStatus.REVOKED, revokedAt: new Date() }
      }),
      this.prisma.auditLog.create({
        data: {
          userId: resetToken.userId,
          action: "RESET_PASSWORD",
          entity: "User",
          entityId: resetToken.userId
        }
      })
    ]);

    return { ok: true, message: "Password updated. Please sign in again." };
  }

  private async findUserByIdentifier(identifier: string) {
    const normalized = identifier.trim();
    const normalizedLower = normalized.toLowerCase();
    const include = {
      campus: { include: { group: true } },
      teacherProfile: true,
      studentProfile: true,
      teacherAssignments: {
        where: { isActive: true },
        include: { permissions: true }
      }
    } as const;

    const userByEmailOrUsername = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalized, mode: "insensitive" } },
          { username: { equals: normalizedLower } },
          { username: { equals: normalized } }
        ]
      },
      include
    });

    if (userByEmailOrUsername) {
      return userByEmailOrUsername;
    }

    const teacher = await this.prisma.teacherProfile.findFirst({
      where: { employeeCode: { equals: normalized, mode: "insensitive" } },
      include: { user: { include } }
    });

    if (teacher) {
      return teacher.user;
    }

    const student = await this.prisma.studentProfile.findFirst({
      where: { rollNumber: { equals: normalized, mode: "insensitive" } },
      include: { user: { include } }
    });

    return student?.user ?? null;
  }

  private async signAccessToken(payload: JwtAccessPayload) {
    return this.jwt.signAsync(payload, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
  }

  private createRefreshToken() {
    return randomBytes(64).toString("base64url");
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private getRefreshExpiry() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
    return expiresAt;
  }

  private toAuthResponseUser(
    user: User & {
      campus?: { groupId: string } | null;
      teacherAssignments: {
        id: string;
        role: "STPO" | "CTPO" | "HTPO";
        campusGroupId: string | null;
        campusId: string | null;
        programId: string | null;
        branchId: string | null;
        batchId: string | null;
        classId: string | null;
        sectionId: string | null;
        subjectId: string | null;
        permissions: { allowed: boolean; action: string }[];
      }[];
    },
    sessionId: string
  ) {
    return {
      id: user.id,
      sessionId,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      type: user.type,
      campusId: user.campusId,
      campusGroupId: user.campus?.groupId,
      assignments: user.teacherAssignments.map((assignment) => ({
        id: assignment.id,
        role: assignment.role,
        campusGroupId: assignment.campusGroupId,
        campusId: assignment.campusId,
        programId: assignment.programId,
        branchId: assignment.branchId,
        batchId: assignment.batchId,
        classId: assignment.classId,
        sectionId: assignment.sectionId,
        subjectId: assignment.subjectId,
        permissions: assignment.permissions.filter((grant) => grant.allowed).map((grant) => grant.action)
      }))
    };
  }
}
