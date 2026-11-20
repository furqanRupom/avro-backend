import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ProductRepository } from '../product/product.repository';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { OrderStatus } from './enums/order-status.enum';
import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { OrderRepository } from './order.repository';
import { OrderItem } from './schemas/order-item.schema';

@Injectable()
export class OrderService {
  // Flat standard delivery charge for Cash on Delivery
  private readonly DEFAULT_DELIVERY_CHARGE = 60;

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async createOrder(customerId: string, createOrderDto: CreateOrderDto) {
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const orderItems: OrderItem[] = [];
    let subtotal = 0;
    let totalDiscount = 0;

    // Track decremented products to rollback if any item fails
    const decrementedProducts: { productId: string; quantity: number }[] = [];

    try {
      for (const itemDto of createOrderDto.items) {
        const product = await this.productRepository.findById(
          itemDto.productId,
        );

        if (!product || !product.isActive) {
          throw new BadRequestException(
            `Product with ID '${itemDto.productId}' is unavailable or inactive`,
          );
        }

        if (product.stock < itemDto.quantity) {
          throw new BadRequestException(
            `Insufficient stock for '${product.name}'. Available: ${product.stock}, requested: ${itemDto.quantity}`,
          );
        }

        // Determine effective price and calculate line totals
        const unitPrice =
          product.discountPrice !== null && product.discountPrice !== undefined
            ? product.discountPrice
            : product.price;

        const lineSubtotal = Number((unitPrice * itemDto.quantity).toFixed(2));
        subtotal += lineSubtotal;

        if (
          product.discountPrice !== null &&
          product.discountPrice !== undefined
        ) {
          const discountDiff = product.price - product.discountPrice;
          totalDiscount += Number(
            (discountDiff * itemDto.quantity).toFixed(2),
          );
        }

        // Snapshot details
        orderItems.push({
          product: product._id as Types.ObjectId,
          productName: product.name,
          productImage: product.images?.[0] || '',
          sku: product.sku,
          unitPrice,
          quantity: itemDto.quantity,
          subtotal: lineSubtotal,
        });

        // Decrement product inventory atomically
        const updated = await this.productRepository.decrementStock(
          product._id.toString(),
          itemDto.quantity,
        );

        if (!updated) {
          throw new BadRequestException(
            `Failed to reserve stock for '${product.name}'. Please try again.`,
          );
        }

        decrementedProducts.push({
          productId: product._id.toString(),
          quantity: itemDto.quantity,
        });
      }

      subtotal = Number(subtotal.toFixed(2));
      totalDiscount = Number(totalDiscount.toFixed(2));
      const deliveryCharge = this.DEFAULT_DELIVERY_CHARGE;
      const totalAmount = Number((subtotal + deliveryCharge).toFixed(2));

      // Generate human-friendly unique order number
      const orderNumber = this.generateOrderNumber();

      const order = await this.orderRepository.create({
        orderNumber,
        customer: new Types.ObjectId(customerId),
        items: orderItems,
        subtotal,
        discount: totalDiscount,
        deliveryCharge,
        totalAmount,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.UNPAID,
        orderStatus: OrderStatus.PENDING,
        shippingAddress: {
          division: createOrderDto.shippingAddress.division || '',
          district: createOrderDto.shippingAddress.district || '',
          area: createOrderDto.shippingAddress.area || '',
          street: createOrderDto.shippingAddress.street || '',
          postalCode: createOrderDto.shippingAddress.postalCode || '',
        },
        customerNote: createOrderDto.customerNote || '',
        stockRestored: false,
      });

      return order;
    } catch (error) {
      // Rollback any stocks decremented in this failed attempt
      for (const item of decrementedProducts) {
        await this.productRepository.incrementStock(
          item.productId,
          item.quantity,
        );
      }
      throw error;
    }
  }

  async getCustomerOrders(customerId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.orderRepository.findByCustomer(customerId, skip, limit),
      this.orderRepository.countByCustomer(customerId),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrderById(orderId: string, currentUserId: string, isAdmin = false) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    const customerRaw = order.customer as any;
    const orderCustomerId =
      customerRaw?._id != null
        ? String(customerRaw._id)
        : String(customerRaw);

    if (!isAdmin && orderCustomerId !== currentUserId) {
      throw new ForbiddenException(
        'You do not have permission to view this order',
      );
    }

    return order;
  }

  async cancelOrder(
    orderId: string,
    currentUserId: string,
    cancelOrderDto: CancelOrderDto,
    isAdmin = false,
  ) {
    const order = await this.getOrderById(orderId, currentUserId, isAdmin);

    if (
      order.orderStatus !== OrderStatus.PENDING &&
      order.orderStatus !== OrderStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        `Order in '${order.orderStatus}' status cannot be cancelled. Only PENDING or CONFIRMED orders are eligible for cancellation.`,
      );
    }

    // Restore stock if not already restored
    if (!order.stockRestored) {
      for (const item of order.items) {
        await this.productRepository.incrementStock(
          item.product.toString(),
          item.quantity,
        );
      }
    }

    return this.orderRepository.updateById(orderId, {
      orderStatus: OrderStatus.CANCELLED,
      cancellationReason:
        cancelOrderDto.cancellationReason || 'Cancelled by customer',
      stockRestored: true,
    });
  }

  async getAllOrdersAdmin(query: QueryOrdersDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.status) {
      filter.orderStatus = query.status;
    }

    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }

    if (query.search) {
      filter.orderNumber = new RegExp(query.search.trim(), 'i');
    }

    const [items, total] = await Promise.all([
      this.orderRepository.findWithFilters(
        filter,
        { createdAt: -1 },
        skip,
        limit,
      ),
      this.orderRepository.countWithFilters(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateOrderStatusAdmin(
    orderId: string,
    updateStatusDto: UpdateOrderStatusDto,
  ) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    const currentStatus = order.orderStatus;
    const nextStatus = updateStatusDto.status;

    // Transition validation
    this.validateStatusTransition(currentStatus, nextStatus);

    // If transitioning to CANCELLED and stock hasn't been restored yet
    if (nextStatus === OrderStatus.CANCELLED && !order.stockRestored) {
      for (const item of order.items) {
        await this.productRepository.incrementStock(
          item.product.toString(),
          item.quantity,
        );
      }
    }

    return this.orderRepository.updateById(orderId, {
      orderStatus: nextStatus,
      stockRestored:
        nextStatus === OrderStatus.CANCELLED ? true : order.stockRestored,
    });
  }

  async updatePaymentStatusAdmin(
    orderId: string,
    updatePaymentDto: UpdatePaymentStatusDto,
  ) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found`);
    }

    const targetPaymentStatus = updatePaymentDto.status;

    // Business rule: COD orders can only be marked PAID if order is DELIVERED
    if (targetPaymentStatus === PaymentStatus.PAID) {
      if (order.orderStatus !== OrderStatus.DELIVERED) {
        throw new BadRequestException(
          `COD order payment can only be confirmed as 'PAID' after order is DELIVERED. Current order status is '${order.orderStatus}'.`,
        );
      }
    }

    return this.orderRepository.updateById(orderId, {
      paymentStatus: targetPaymentStatus,
    });
  }

  private validateStatusTransition(
    current: OrderStatus,
    next: OrderStatus,
  ) {
    if (current === next) {
      return;
    }

    if (current === OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Delivered orders are in a terminal state and cannot change status',
      );
    }

    if (current === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Cancelled orders are in a terminal state and cannot change status',
      );
    }

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [
        OrderStatus.PROCESSING,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PROCESSING]: [
        OrderStatus.SHIPPED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    const allowed = validTransitions[current] || [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Invalid status transition from '${current}' to '${next}'. Allowed next statuses: [${allowed.join(', ')}]`,
      );
    }
  }

  private generateOrderNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `AVRO-${dateStr}-${randomHex}`;
  }
}
