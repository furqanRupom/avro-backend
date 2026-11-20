import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from './enums/role.enum';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(userData: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(userData);
    return user.save();
  }

  async findByEmail(
    email: string,
    includePassword = false,
  ): Promise<UserDocument | null> {
    const query = this.userModel.findOne({ email: email.toLowerCase().trim() });
    if (includePassword) {
      query.select('+password');
    }
    return query.exec();
  }

  async findById(
    id: string,
    includePassword = false,
  ): Promise<UserDocument | null> {
    const query = this.userModel.findById(id);
    if (includePassword) {
      query.select('+password');
    }
    return query.exec();
  }

  async updateById(
    id: string,
    updateData: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();
  }

  async countByRole(role: Role): Promise<number> {
    return this.userModel.countDocuments({ role, isActive: true }).exec();
  }
}
