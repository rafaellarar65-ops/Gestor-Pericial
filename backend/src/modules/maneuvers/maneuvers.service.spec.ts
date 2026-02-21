import { NotFoundException } from '@nestjs/common';
import { ManeuversService } from './maneuvers.service';

describe('ManeuversService', () => {
  let service: ManeuversService;

  beforeEach(() => {
    service = new ManeuversService();
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
