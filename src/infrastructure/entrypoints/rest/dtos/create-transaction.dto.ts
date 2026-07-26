import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { DocumentTypeEnum } from '../../../../domain/resources/document-type.enum';

export class CustomerDto {
  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @Length(3, 120)
  fullName!: string;

  @ApiProperty({ example: '1098765432' })
  @IsString()
  @Matches(/^\d{5,15}$/, {
    message: 'document must contain between 5 and 15 digits',
  })
  document!: string;

  @ApiProperty({ enum: DocumentTypeEnum, example: DocumentTypeEnum.CC })
  @IsEnum(DocumentTypeEnum)
  documentType!: DocumentTypeEnum;

  @ApiProperty({ example: '3001234567' })
  @IsString()
  @Matches(/^\+?\d{7,15}$/, {
    message: 'phoneNumber must be a valid phone number',
  })
  phoneNumber!: string;
}

export class DeliveryDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @Length(3, 120)
  recipientName!: string;

  @ApiProperty({ example: 'Calle 100 #10-20, Apto 501' })
  @IsString()
  @Length(5, 200)
  address!: string;

  @ApiProperty({ example: 'Bucaramanga' })
  @IsString()
  @Length(2, 80)
  city!: string;

  @ApiProperty({ example: 'Santander' })
  @IsString()
  @Length(2, 80)
  region!: string;

  @ApiProperty({ example: 'CO' })
  @IsString()
  @Length(2, 2)
  country!: string;

  @ApiProperty({ example: '3001234567' })
  @IsString()
  @Matches(/^\+?\d{7,15}$/)
  phoneNumber!: string;

  @ApiPropertyOptional({ example: '680001' })
  @IsOptional()
  @IsString()
  @Length(3, 12)
  postalCode?: string;
}

export class CreateTransactionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @IsPositive()
  quantity!: number;

  @ApiProperty({ type: CustomerDto })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer!: CustomerDto;

  @ApiProperty({ type: DeliveryDto })
  @ValidateNested()
  @Type(() => DeliveryDto)
  delivery!: DeliveryDto;

  @ApiProperty({
    example: '4242424242424242',
    description:
      'Used only to derive the brand and last four digits. Never stored in full.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[\d\s-]{13,25}$/, { message: 'cardNumber has an invalid format' })
  cardNumber!: string;
}
