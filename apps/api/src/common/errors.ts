import { HttpException, HttpStatus } from "@nestjs/common";

export function apiError(status: HttpStatus, code: string, message: string, details: unknown = null): never {
  throw new HttpException({ code, message, details }, status);
}
