import { NotFoundException } from '@nestjs/common';
import { LaudoService } from './laudo.service';

describe('LaudoService', () => {
  let service: LaudoService;

  beforeEach(() => {
    service = new LaudoService();
  });

  it('creates and returns a record (happy path)', () => {
    const created = service.create({ name: 'demo' } as any);
    expect(created).toHaveProperty('id');
    expect(service.findAll()).toHaveLength(1);
  });

  it('throws NotFoundException on missing record (edge case)', () => {
    expect(() => service.findOne('404')).toThrow(NotFoundException);
  });
});
