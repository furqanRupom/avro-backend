import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(data: Partial<Category>): Promise<CategoryDocument> {
    const category = new this.categoryModel(data);
    return category.save();
  }

  async findAll(activeOnly = false): Promise<CategoryDocument[]> {
    const filter = activeOnly ? { isActive: true } : {};
    return this.categoryModel.find(filter).sort({ name: 1 }).exec();
  }

  async findById(id: string): Promise<CategoryDocument | null> {
    return this.categoryModel.findById(id).exec();
  }

  async findBySlug(slug: string): Promise<CategoryDocument | null> {
    return this.categoryModel
      .findOne({ slug: slug.toLowerCase().trim() })
      .exec();
  }

  async updateById(
    id: string,
    data: Partial<Category>,
  ): Promise<CategoryDocument | null> {
    return this.categoryModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<CategoryDocument | null> {
    return this.categoryModel.findByIdAndDelete(id).exec();
  }

  async count(activeOnly = false): Promise<number> {
    const filter = activeOnly ? { isActive: true } : {};
    return this.categoryModel.countDocuments(filter).exec();
  }
}
