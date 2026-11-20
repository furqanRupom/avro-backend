import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { OrderService } from './order.service';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth('token')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place a Cash on Delivery order (Customer)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or validation failure' })
  async createOrder(
    @CurrentUser('_id') customerId: string,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(customerId.toString(), createOrderDto);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'View own order history (Customer)' })
  @ApiResponse({ status: 200, description: 'Paginated customer orders' })
  async getMyOrders(
    @CurrentUser('_id') customerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.orderService.getCustomerOrders(
      customerId.toString(),
      Number(page),
      Number(limit),
    );
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'View all shop orders (Admin)' })
  @ApiResponse({ status: 200, description: 'Paginated shop orders' })
  async getAllOrdersAdmin(@Query() query: QueryOrdersDto) {
    return this.orderService.getAllOrdersAdmin(query);
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get order details by ID (Admin)' })
  @ApiResponse({ status: 200, description: 'Order details' })
  async getOrderAdmin(@Param('id') id: string) {
    return this.orderService.getOrderById(id, '', true);
  }

  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update order status with transition rules (Admin)' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateOrderStatusAdmin(id, updateStatusDto);
  }

  @Patch('admin/:id/payment')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Confirm COD cash collection as PAID (Admin)' })
  @ApiResponse({ status: 200, description: 'Payment status updated' })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentStatusDto,
  ) {
    return this.orderService.updatePaymentStatusAdmin(id, updatePaymentDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'View individual order details (Customer or Admin)' })
  @ApiResponse({ status: 200, description: 'Order details' })
  async getOrder(
    @Param('id') id: string,
    @CurrentUser('_id') customerId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.orderService.getOrderById(
      id,
      customerId.toString(),
      role === Role.ADMIN,
    );
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an eligible order and restore stock (Customer)' })
  @ApiResponse({ status: 200, description: 'Order cancelled and stock restored' })
  @ApiResponse({ status: 400, description: 'Order not eligible for cancellation' })
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser('_id') customerId: string,
    @CurrentUser('role') role: Role,
    @Body() cancelOrderDto: CancelOrderDto,
  ) {
    return this.orderService.cancelOrder(
      id,
      customerId.toString(),
      cancelOrderDto,
      role === Role.ADMIN,
    );
  }
}
