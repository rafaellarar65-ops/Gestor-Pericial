import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAgendaDto, UpdateAgendaDto } from './dto/agenda.dto';

@Injectable()
export class AgendaService {
  private readonly records: Array<Record<string, unknown>> = [];

  create(dto: CreateAgendaDto) {
    const item = { id: String(this.records.length + 1), ...dto };
    this.records.push(item);
    return item;
  }

  findAll() {
    return this.records;
  }

  findOne(id: string) {
    const found = this.records.find((item) => item.id === id);
    if (!found) throw new NotFoundException('agenda not found');
    return found;
  }

  update(id: string, dto: UpdateAgendaDto) {
    const index = this.records.findIndex((item) => item.id === id);
    if (index < 0) throw new NotFoundException('agenda not found');
    this.records[index] = { ...this.records[index], ...dto };
    return this.records[index];
  }
}
