import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'API Health check' })
  @ApiResponse({ status: 200, description: 'Application is running' })
  getHealth() {
    return this.appService.getHealthStatus();
  }
}
