import { Body, Controller, Get, Header, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { CreateInvoiceRequest, RecordInvoicePaymentRequest } from '@mdh/types';
import { Public, RequirePermissions, RequestUser } from '../../common/guards';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private invoices: InvoicesService) {}

  @ApiBearerAuth()
  @RequirePermissions('invoices.read')
  @Get('stats')
  stats() {
    return this.invoices.stats();
  }

  @ApiBearerAuth()
  @Get('mine')
  mine(@Req() req: { user: RequestUser }) {
    return this.invoices.mine(req.user.id);
  }

  @ApiBearerAuth()
  @Get('mine/:id/link')
  shareMine(@Req() req: { user: RequestUser }, @Param('id') id: string) {
    return this.invoices.shareMine(req.user.id, id);
  }

  @ApiBearerAuth()
  @Get('mine/:id/pdf')
  async minePdf(@Req() req: { user: RequestUser }, @Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.invoices.pdfMine(req.user.id, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.end(buffer);
  }

  @ApiBearerAuth()
  @Get('mine/:id')
  mineOne(@Req() req: { user: RequestUser }, @Param('id') id: string) {
    return this.invoices.getMine(req.user.id, id);
  }

  @Public()
  @Get('share/:token/pdf')
  @Header('Cache-Control', 'private, no-store')
  async sharePdf(@Param('token') token: string, @Res() res: Response) {
    const { buffer, filename } = await this.invoices.pdfFromShareToken(token);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.end(buffer);
  }

  @ApiBearerAuth()
  @RequirePermissions('invoices.read')
  @Get()
  list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.invoices.list({
      status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      from,
      to,
    });
  }

  @ApiBearerAuth()
  @RequirePermissions('invoices.write')
  @Post()
  create(@Req() req: { user: RequestUser }, @Body() body: CreateInvoiceRequest) {
    return this.invoices.create(body, req.user);
  }

  @ApiBearerAuth()
  @RequirePermissions('invoices.read')
  @Get(':id/pdf')
  async pdf(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Query('download') download: string | undefined,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.invoices.generatePdf(id, req.user);
    const disposition = download === '0' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.end(buffer);
  }

  @ApiBearerAuth()
  @RequirePermissions('invoices.read')
  @Post(':id/share')
  async share(@Param('id') id: string) {
    const url = await this.invoices.shareUrl(id);
    return { url };
  }

  @ApiBearerAuth()
  @RequirePermissions('invoices.send')
  @Post(':id/email')
  sendEmail(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Body() body: { to?: string },
  ) {
    return this.invoices.sendEmail(id, req.user, body?.to);
  }

  @ApiBearerAuth()
  @RequirePermissions('invoices.send')
  @Post(':id/whatsapp')
  sendWhatsApp(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Body() body: { whatsapp?: string },
  ) {
    return this.invoices.sendWhatsApp(id, req.user, body?.whatsapp);
  }

  @ApiBearerAuth()
  @RequirePermissions('invoices.pay')
  @Post(':id/payments')
  pay(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Body() body: RecordInvoicePaymentRequest,
  ) {
    return this.invoices.recordPayment(id, body, req.user);
  }

  @ApiBearerAuth()
  @RequirePermissions('invoices.cancel')
  @Post(':id/cancel')
  cancel(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.invoices.cancel(id, req.user, body?.reason);
  }

  @ApiBearerAuth()
  @RequirePermissions('invoices.write')
  @Patch(':id')
  update(
    @Req() req: { user: RequestUser },
    @Param('id') id: string,
    @Body() body: Partial<CreateInvoiceRequest>,
  ) {
    return this.invoices.update(id, body, req.user);
  }

  @ApiBearerAuth()
  @RequirePermissions('invoices.read')
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.invoices.getById(id);
  }
}
