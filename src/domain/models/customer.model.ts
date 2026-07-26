import { DocumentTypeEnum } from '../resources/document-type.enum';

export class Customer {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly fullName: string,
    public readonly document: string,
    public readonly documentType: DocumentTypeEnum,
    public readonly phoneNumber: string,
  ) {}
}
