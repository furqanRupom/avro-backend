import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';

export interface DashboardOverview {
  totalCustomers: number;
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  paidCodRevenue: number;
  outstandingDeliveredCodAmount: number;
  lowStockProducts: any[];
  recentOrders: any[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getOverview(): Promise<DashboardOverview> {
    const [
      totalCustomers,
      totalProducts,
      orderStats,
      lowStockProducts,
      recentOrders,
    ] = await Promise.all([
      this.dashboardRepository.countCustomers(),
      this.dashboardRepository.countProducts(),
      this.dashboardRepository.getOrderSummaryStats(),
      this.dashboardRepository.getLowStockProducts(5, 5),
      this.dashboardRepository.getRecentOrders(5),
    ]);

    return {
      totalCustomers,
      totalProducts,
      totalOrders: orderStats.totalOrders,
      pendingOrders: orderStats.pendingOrders,
      deliveredOrders: orderStats.deliveredOrders,
      cancelledOrders: orderStats.cancelledOrders,
      paidCodRevenue: orderStats.paidRevenue,
      outstandingDeliveredCodAmount: orderStats.outstandingDeliveredAmount,
      lowStockProducts,
      recentOrders,
    };
  }
}
