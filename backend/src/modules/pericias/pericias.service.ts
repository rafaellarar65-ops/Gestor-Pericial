import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePericiasDto, UpdatePericiasDto } from './dto/pericias.dto';

@Injectable()
export class PericiasService {
  private readonly records: Array<Record<string, unknown>> = [];

  create(dto: CreatePericiasDto) {
    const item = { id: String(this.records.length + 1), ...dto };
    this.records.push(item);
    return item;
  }

  findAll() {
    return this.records;
  }

  findOne(id: string) {
    const found = this.records.find((item) => item.id === id);
    if (!found) throw new NotFoundException('pericias not found');
    return found;
  }

  update(id: string, dto: UpdatePericiasDto) {
    const index = this.records.findIndex((item) => item.id === id);
    if (index < 0) throw new NotFoundException('pericias not found');
    this.records[index] = { ...this.records[index], ...dto };
    return this.records[index];
  }
}
