import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { CurrentUser } from "./current-user.decorator";
import { AuthService } from "./auth.service";
import { AuthUser } from "./auth.types";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { LoginDto } from "./login.dto";
import { RefreshTokenDto } from "./refresh-token.dto";
import { getRequestContext } from "./request-context";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.auth.login(dto, getRequestContext(request));
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.auth.refresh(dto, getRequestContext(request));
  }

  @Post("logout")
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout-current")
  logoutCurrent(@CurrentUser() user: AuthUser) {
    return this.auth.logoutCurrentSession(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
