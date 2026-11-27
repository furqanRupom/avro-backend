import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import { AuthRepository } from './auth.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Role } from './enums/role.enum';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existing = await this.authRepository.findByEmail(registerDto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const user = await this.authRepository.create({
      name: registerDto.name,
      email: registerDto.email.toLowerCase().trim(),
      password: hashedPassword,
      phone: registerDto.phone || '',
      role: Role.CUSTOMER, // Always enforce CUSTOMER role for public registration
      address: {
        division: registerDto.address?.division || '',
        district: registerDto.address?.district || '',
        area: registerDto.address?.area || '',
        street: registerDto.address?.street || '',
        postalCode: registerDto.address?.postalCode || '',
      },
      isActive: true,
    });

    const userObj = user.toObject();
    delete (userObj as any).password;
    return userObj;
  }

  async login(loginDto: LoginDto, res: Response) {
    const user = await this.authRepository.findByEmail(loginDto.email, true);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    this.setTokenCookie(res, token);

    const userObj = user.toObject();
    delete (userObj as any).password;

    return {
      user: userObj,
      token,
    };
  }

  logout(res: Response) {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const updateData: Record<string, any> = {};

    if (updateProfileDto.name !== undefined) {
      updateData.name = updateProfileDto.name;
    }
    if (updateProfileDto.phone !== undefined) {
      updateData.phone = updateProfileDto.phone;
    }
    if (updateProfileDto.address !== undefined) {
      updateData.address = updateProfileDto.address;
    }

    const updatedUser = await this.authRepository.updateById(userId, updateData);
    if (!updatedUser) {
      throw new BadRequestException('User not found');
    }

    const userObj = updatedUser.toObject();
    delete (userObj as any).password;
    return userObj;
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ) {
    const user = await this.authRepository.findById(userId, true);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isMatch = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isMatch) {
      throw new BadRequestException('Current password does not match');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      salt,
    );

    await this.authRepository.updateById(userId, {
      password: hashedPassword,
    });

    return { message: 'Password changed successfully' };
  }

  private setTokenCookie(res: Response, token: string) {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
}
