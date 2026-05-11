import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(email: string, username: string, password: string): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ email }).exec();
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new this.userModel({
      email,
      username,
      password: hashedPassword,
    });
    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async validatePassword(user: UserDocument, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    if (refreshToken) {
      const hashed = await bcrypt.hash(refreshToken, 12);
      await this.userModel.findByIdAndUpdate(userId, { refreshToken: hashed }).exec();
    } else {
      await this.userModel.findByIdAndUpdate(userId, { refreshToken: null }).exec();
    }
  }

  async findByRefreshToken(userId: string, refreshToken: string): Promise<UserDocument | null> {
    const user = await this.userModel.findById(userId).exec();
    if (!user || !user.refreshToken) return null;

    const matches = await bcrypt.compare(refreshToken, user.refreshToken);
    return matches ? user : null;
  }
}
