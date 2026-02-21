import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFinancialDto, UpdateFinancialDto } from './dto/financial.dto';

@Injectable()
export class FinancialService {
  private readonly records: Array<Record<string, unknown>> = [];

  create(dto: CreateFinancialDto) {
    const item = { id: String(this.records.length + 1), ...dto };
    this.records.push(item);
    return item;
  }

  findAll() {
    return this.records;
  }

  findOne(id: string) {
    const found = this.records.find((item) => item.id === id);
    if (!found) throw new NotFoundException('financial not found');
    return found;
  }

  update(id: string, dto: UpdateFinancialDto) {
    const index = this.records.findIndex((item) => item.id === id);
    if (index < 0) throw new NotFoundException('financial not found');
    this.records[index] = { ...this.records[index], ...dto };
    return this.records[index];
  }
}
