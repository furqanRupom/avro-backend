import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async create(data: Partial<Order>): Promise<OrderDocument> {
    const order = new this.orderModel(data);
    return order.save();
  }

  async findById(id: string): Promise<OrderDocument | null> {
    return this.orderModel.findById(id).populate('customer', 'name email phone').exec();
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderDocument | null> {
    return this.orderModel
      .findOne({ orderNumber: orderNumber.toUpperCase().trim() })
      .populate('customer', 'name email phone')
      .exec();
  }

  async findByCustomer(
    customerId: string,
    skip: number,
    limit: number,
  ): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ customer: new Types.ObjectId(customerId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countByCustomer(customerId: string): Promise<number> {
    return this.orderModel
      .countDocuments({ customer: new Types.ObjectId(customerId) })
      .exec();
  }

  async findWithFilters(
    filter: Record<string, any>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number,
  ): Promise<OrderDocument[]> {
    return this.orderModel
      .find(filter)
      .populate('customer', 'name email phone')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countWithFilters(filter: Record<string, any>): Promise<number> {
    return this.orderModel.countDocuments(filter).exec();
  }

  async updateById(
    id: string,
    data: Partial<Order>,
  ): Promise<OrderDocument | null> {
    return this.orderModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .populate('customer', 'name email phone')
      .exec();
  }
}
