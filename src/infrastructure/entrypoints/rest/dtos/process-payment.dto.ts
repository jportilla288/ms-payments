import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CardDto {
  @ApiProperty({ example: '4242424242424242' })
  @IsString()
  @Matches(/^[\d\s-]{13,25}$/)
  number!: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @Matches(/^\d{3,4}$/, { message: 'cvc must contain 3 or 4 digits' })
  cvc!: string;

  @ApiProperty({ example: '08' })
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])$/, {
    message: 'expMonth must be between 01 and 12',
  })
  expMonth!: string;

  @ApiProperty({ example: '29' })
  @IsString()
  @Matches(/^\d{2}$/, { message: 'expYear must be two digits' })
  expYear!: string;

  @ApiProperty({ example: 'JANE DOE' })
  @IsString()
  @Length(3, 120)
  cardHolder!: string;
}

export class ProcessPaymentDto {
  @ApiProperty({ type: CardDto })
  @ValidateNested()
  @Type(() => CardDto)
  card!: CardDto;

  @ApiProperty({ example: 1, minimum: 1, maximum: 36 })
  @IsInt()
  @Min(1)
  @Max(36)
  installments!: number;
}
