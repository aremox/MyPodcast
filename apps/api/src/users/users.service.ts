import { Injectable, ConflictException, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    // Seeding migration: ensure all users have a valid role assigned
    try {
      const users = await this.userModel.find({}).exec();
      this.logger.log(`Running user roles migration. Total users: ${users.length}`);
      for (const user of users) {
        if (!user.role || user.role === 'testuser') {
          const role = 'usuario';
          await this.userModel.findByIdAndUpdate(user._id, { role }).exec();
          this.logger.log(`Seeded user ${user.username} role as ${role}`);
        }
      }
    } catch (err) {
      this.logger.error(`Error running user roles migration: ${err.message}`);
    }
  }

  async create(email: string, username: string, password: string): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ email }).exec();
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const count = await this.userModel.countDocuments().exec();
    // First user is automatically administrador, subsequent ones are blocked
    const role = count === 0 ? 'administrador' : 'bloqueado';

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new this.userModel({
      email,
      username,
      password: hashedPassword,
      role,
    });
    return user.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-password -refreshToken').exec();
  }

  async updateRole(id: string, role: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    user.role = role;
    return user.save();
  }

  async delete(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }
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
