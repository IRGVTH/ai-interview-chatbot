import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  override getAuthenticateOptions() {
    return {
      scope: ["email", "profile"],
    };
  }
}