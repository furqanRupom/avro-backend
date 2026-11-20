import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({ example: 25, minimum: 0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock: number;
}
