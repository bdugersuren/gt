import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Validate user credentials during login
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('Хэрэглэгчийн нэр эсвэл нууц үг буруу байна');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Хэрэглэгчийн нэр эсвэл нууц үг буруу байна');
    }

    // Exclude password hash from user object
    const { passwordHash, ...result } = user;
    return result;
  }

  // Generate JWT access token for successfully authenticated user
  async login(user: any) {
    const payload = {
      sub: user.id,
      username: user.username,
      roles: user.roles,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        code: user.code,
      },
    };
  }

  async register(data: any) {
    const { username, email, password, fullName, registerNumber, code } = data;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email },
          { code },
        ],
      },
    });

    if (existingUser) {
      throw new UnauthorizedException('Хэрэглэгчийн нэр, имэйл эсвэл код аль хэдийн бүртгэгдсэн байна');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        fullName,
        registerNumber,
        code,
        // Public registration must never be able to grant privileged roles.
        roles: ['STUDENT'],
      },
    });

    return this.login(newUser);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    // Do not disclose whether the account exists and never assign a shared
    // temporary password. Token delivery is intentionally disabled until an
    // email provider and persistent, single-use reset-token store are configured.
    return {
      success: true,
      message: 'Хэрэв уг имэйл бүртгэлтэй бол нууц үг сэргээх заавар илгээгдэнэ.',
    };
  }
}
