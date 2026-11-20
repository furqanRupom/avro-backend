import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(data: Partial<Product>): Promise<ProductDocument> {
    const product = new this.productModel(data);
    return product.save();
  }

  async findById(id: string): Promise<ProductDocument | null> {
    return this.productModel.findById(id).populate('category').exec();
  }

  async findBySlug(
    slug: string,
    activeOnly = false,
  ): Promise<ProductDocument | null> {
    const filter: Record<string, any> = {
      slug: slug.toLowerCase().trim(),
    };
    if (activeOnly) {
      filter.isActive = true;
    }
    return this.productModel.findOne(filter).populate('category').exec();
  }

  async findBySku(sku: string): Promise<ProductDocument | null> {
    return this.productModel
      .findOne({ sku: sku.toUpperCase().trim() })
      .exec();
  }

  async updateById(
    id: string,
    data: Partial<Product>,
  ): Promise<ProductDocument | null> {
    return this.productModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .populate('category')
      .exec();
  }

  async deleteById(id: string): Promise<ProductDocument | null> {
    return this.productModel.findByIdAndDelete(id).exec();
  }

  async findWithFilters(
    filter: Record<string, any>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number,
  ): Promise<ProductDocument[]> {
    return this.productModel
      .find(filter)
      .populate('category')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countWithFilters(
    filter: Record<string, any>,
  ): Promise<number> {
    return this.productModel.countDocuments(filter).exec();
  }

  async countByCategoryId(categoryId: string): Promise<number> {
    return this.productModel.countDocuments({ category: categoryId }).exec();
  }

  async decrementStock(
    id: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<ProductDocument | null> {
    const query = this.productModel.findOneAndUpdate(
      { _id: id, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true },
    );
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async incrementStock(
    id: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<ProductDocument | null> {
    const query = this.productModel.findByIdAndUpdate(
      id,
      { $inc: { stock: quantity } },
      { new: true },
    );
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findLowStock(threshold = 5, limit = 10): Promise<ProductDocument[]> {
    return this.productModel
      .find({ stock: { $lte: threshold }, isActive: true })
      .sort({ stock: 1 })
      .limit(limit)
      .populate('category')
      .exec();
  }

  async countTotal(activeOnly = false): Promise<number> {
    const filter = activeOnly ? { isActive: true } : {};
    return this.productModel.countDocuments(filter).exec();
  }
}
