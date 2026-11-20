import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../auth/enums/role.enum';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { OrderStatus } from '../order/enums/order-status.enum';
import { PaymentStatus } from '../order/enums/payment-status.enum';
import { Order, OrderDocument } from '../order/schemas/order.schema';
import { Product, ProductDocument } from '../product/schemas/product.schema';

@Injectable()
export class DashboardRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  async countCustomers(): Promise<number> {
    return this.userModel.countDocuments({ role: Role.CUSTOMER, isActive: true }).exec();
  }

  async countProducts(): Promise<number> {
    return this.productModel.countDocuments().exec();
  }

  async getOrderSummaryStats(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    paidRevenue: number;
    outstandingDeliveredAmount: number;
  }> {
    const stats = await this.orderModel.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', OrderStatus.PENDING] }, 1, 0] },
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', OrderStatus.DELIVERED] }, 1, 0] },
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', OrderStatus.CANCELLED] }, 1, 0] },
          },
          paidRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', PaymentStatus.PAID] },
                '$totalAmount',
                0,
              ],
            },
          },
          outstandingDeliveredAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$orderStatus', OrderStatus.DELIVERED] },
                    { $eq: ['$paymentStatus', PaymentStatus.UNPAID] },
                  ],
                },
                '$totalAmount',
                0,
              ],
            },
          },
        },
      },
    ]);

    if (!stats || stats.length === 0) {
      return {
        totalOrders: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        paidRevenue: 0,
        outstandingDeliveredAmount: 0,
      };
    }

    return {
      totalOrders: stats[0].totalOrders || 0,
      pendingOrders: stats[0].pendingOrders || 0,
      deliveredOrders: stats[0].deliveredOrders || 0,
      cancelledOrders: stats[0].cancelledOrders || 0,
      paidRevenue: Number((stats[0].paidRevenue || 0).toFixed(2)),
      outstandingDeliveredAmount: Number(
        (stats[0].outstandingDeliveredAmount || 0).toFixed(2),
      ),
    };
  }

  async getLowStockProducts(threshold = 5, limit = 5): Promise<ProductDocument[]> {
    return this.productModel
      .find({ stock: { $lte: threshold }, isActive: true })
      .select('name sku stock price category')
      .populate('category', 'name')
      .sort({ stock: 1 })
      .limit(limit)
      .exec();
  }

  async getRecentOrders(limit = 5): Promise<OrderDocument[]> {
    return this.orderModel
      .find()
      .select('orderNumber customer totalAmount orderStatus paymentStatus createdAt')
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}
