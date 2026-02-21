import { NotFoundException } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

describe('IntegrationsService', () => {
  let service: IntegrationsService;

  beforeEach(() => {
    service = new IntegrationsService();
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
