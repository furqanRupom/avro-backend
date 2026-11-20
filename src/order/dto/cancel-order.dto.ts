import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelOrderDto {
  @ApiPropertyOptional({
    example: 'Ordered by mistake or changed my mind',
  })
  @IsString()
  @IsOptional()
  cancellationReason?: string;
}
