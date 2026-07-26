import { DeliveryStatusEnum } from '../resources/delivery-status.enum';

export class Delivery {
  constructor(
    public readonly id: string,
    public readonly transactionId: string,
    public readonly customerId: string,
    public readonly recipientName: string,
    public readonly address: string,
    public readonly city: string,
    public readonly region: string,
    public readonly country: string,
    public readonly phoneNumber: string,
    public readonly status: DeliveryStatusEnum,
    public readonly postalCode: string | null = null,
  ) {}
}
