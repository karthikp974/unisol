import { UserType } from "./auth-types";

export function getDefaultPortal(type: UserType) {
  if (type === "ADMIN") {
    return "/admin";
  }

  if (type === "TEACHER") {
    return "/teacher";
  }

  return "/student";
}
