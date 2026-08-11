export interface OrderNotificationRecipientDto {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertOrderNotificationRecipientDto {
  email: string;
}
