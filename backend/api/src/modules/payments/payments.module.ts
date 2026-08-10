import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { RazorpayService } from './razorpay.service';

@Module({
  controllers: [PaymentsController],
  providers: [RazorpayService],
  exports: [RazorpayService],
})
export class PaymentsModule {}
