import { AiService } from './ai.service';

describe('AiService', () => {
  const prisma = {
    dailyUsage: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const context = { get: jest.fn().mockReturnValue('t-1') };

  let service: AiService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AiService(prisma, context as any);
  });

  it('analyzes document and returns summary (happy path)', async () => {
    prisma.dailyUsage.findFirst.mockResolvedValue(null);
    prisma.dailyUsage.create.mockResolvedValue({ id: 'du-1' });

    const result = (await service.analyzeDocument({ fileName: 'doc.pdf', fileBase64: 'aGVsbG8=' })) as any;

    expect(result.summary).toContain('doc.pdf');
    expect(result.cached).toBe(false);
  });

  it('returns cached response for same payload (edge case)', async () => {
    prisma.dailyUsage.findFirst.mockResolvedValue(null);
    prisma.dailyUsage.create.mockResolvedValue({ id: 'du-1' });

    await service.analyzeDocument({ fileName: 'doc.pdf', fileBase64: 'aGVsbG8=' });
    const second = await service.analyzeDocument({ fileName: 'doc.pdf', fileBase64: 'aGVsbG8=' });

    expect(second.cached).toBe(true);
  });
});
