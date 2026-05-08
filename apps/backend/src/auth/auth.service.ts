import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthSessionStatus, User, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser, JwtAccessPayload } from "./auth.types";
import { LoginDto } from "./login.dto";
import { RefreshTokenDto } from "./refresh-token.dto";
import { RequestContext } from "./request-context";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_DAYS = 30;

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

    const userByUsername = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: { equals: normalizedLower } }, { username: { equals: normalized } }]
      },
      include
    });

    if (userByUsername) {
      return userByUsername;
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
