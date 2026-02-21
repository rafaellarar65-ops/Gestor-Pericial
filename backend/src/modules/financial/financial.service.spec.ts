import { NotFoundException } from '@nestjs/common';
import { FinancialService } from './financial.service';

describe('FinancialService', () => {
  let service: FinancialService;

  beforeEach(() => {
    service = new FinancialService();
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
