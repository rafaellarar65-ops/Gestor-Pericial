import { NotFoundException } from '@nestjs/common';
import { LaudoService } from './laudo.service';

describe('LaudoService', () => {
  const prisma = {
    preLaudo: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    examPlan: { create: jest.fn() },
    examPerformed: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  } as any;

  let service: LaudoService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LaudoService(prisma);
  });

  it('creates pre-laudo (happy path)', async () => {
    prisma.preLaudo.create.mockResolvedValue({ id: 'pl-1' });
    const result = await service.createPreLaudo({ periciaId: 'a6f7f363-fd5b-4c4d-8171-c6d65144f8d3' });
    expect(result.id).toBe('pl-1');
  });

  it('throws NotFoundException when transcribing unknown exam (edge case)', async () => {
    prisma.examPerformed.findFirst.mockResolvedValue(null);
    await expect(
      service.transcription({ examPerformedId: 'a6f7f363-fd5b-4c4d-8171-c6d65144f8d3', audioBase64: 'abc' }),
    ).rejects.toThrow(NotFoundException);
  });
});
