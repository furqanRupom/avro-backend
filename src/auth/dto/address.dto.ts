import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AddressDto {
  @ApiPropertyOptional({ example: 'Dhaka' })
  @IsString()
  @IsOptional()
  division?: string;

  @ApiPropertyOptional({ example: 'Dhaka' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ example: 'Dhanmondi' })
  @IsString()
  @IsOptional()
  area?: string;

  @ApiPropertyOptional({ example: 'Road 27, House 12' })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({ example: '1209' })
  @IsString()
  @IsOptional()
  postalCode?: string;
}
