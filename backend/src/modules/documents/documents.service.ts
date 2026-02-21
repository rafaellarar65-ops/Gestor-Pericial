import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDocumentsDto, UpdateDocumentsDto } from './dto/documents.dto';

@Injectable()
export class DocumentsService {
  private readonly records: Array<Record<string, unknown>> = [];

  create(dto: CreateDocumentsDto) {
    const item = { id: String(this.records.length + 1), ...dto };
    this.records.push(item);
    return item;
  }

  findAll() {
    return this.records;
  }

  findOne(id: string) {
    const found = this.records.find((item) => item.id === id);
    if (!found) throw new NotFoundException('documents not found');
    return found;
  }

  update(id: string, dto: UpdateDocumentsDto) {
    const index = this.records.findIndex((item) => item.id === id);
    if (index < 0) throw new NotFoundException('documents not found');
    this.records[index] = { ...this.records[index], ...dto };
    return this.records[index];
  }
}
