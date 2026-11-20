import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Address, AddressSchema } from '../../auth/schemas/user.schema';
import { User } from '../../auth/schemas/user.schema';
import { OrderStatus } from '../enums/order-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { OrderItem, OrderItemSchema } from './order-item.schema';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  customer: Types.ObjectId | User;

  @Prop({ type: [OrderItemSchema], required: true, default: [] })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ type: Number, default: 0, min: 0 })
  discount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  deliveryCharge: number;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({
    type: String,
    enum: PaymentMethod,
    default: PaymentMethod.COD,
  })
  paymentMethod: PaymentMethod;

  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
    index: true,
  })
  paymentStatus: PaymentStatus;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.PENDING,
    index: true,
  })
  orderStatus: OrderStatus;

  @Prop({ type: AddressSchema, required: true })
  shippingAddress: Address;

  @Prop({ type: String, default: '', trim: true })
  customerNote: string;

  @Prop({ type: String, default: '', trim: true })
  cancellationReason: string;

  @Prop({ type: Boolean, default: false })
  stockRestored: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Compound index for customer order history query performance
OrderSchema.index({ customer: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1, createdAt: -1 });
