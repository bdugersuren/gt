import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ForgotPasswordDto, RegisterDto } from './dto/register.dto';
import { AuthRateLimiter } from './auth-rate-limiter.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private rateLimiter: AuthRateLimiter) {}

  // Handle credentials login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Request() req: any) {
    this.rateLimiter.check(`login:${req.ip}:${loginDto.username}`, 5, 15 * 60_000);
    // Validate user credentials
    const user = await this.authService.validateUser(loginDto.username, loginDto.password);
    // Return JWT token and user info
    return this.authService.login(user);
  }

  // Retrieve current user details (secured by JWT Guard)
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req: any) {
    return req.user;
  }

  @Post('register')
  async register(@Body() body: RegisterDto, @Request() req: any) {
    this.rateLimiter.check(`register:${req.ip}`, 5, 60 * 60_000);
    return this.authService.register(body);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto, @Request() req: any) {
    this.rateLimiter.check(`forgot:${req.ip}`, 5, 60 * 60_000);
    return this.authService.forgotPassword(body.email);
  }
}
