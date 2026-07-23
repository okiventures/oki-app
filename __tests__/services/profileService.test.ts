import {
  listServiceCatalog,
  listHandymanServices,
  addHandymanService,
  updateServicePrice,
  removeHandymanService,
} from '../../src/services/profileService';

const mockGetSession = jest.fn();
const mockFrom = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// profileService also imports these for avatar upload (unused by the functions
// under test), but importing the real modules pulls in Expo's runtime setup,
// which jest-setup.cjs's minimal `window` stub can't satisfy.
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-file-system', () => ({}));

type Chain = {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  single: jest.Mock;
};

function makeChain(resolved: { data: unknown; error: { message: string } | null }): Chain {
  const chain: Partial<Chain> = {};
  chain.select = jest.fn(() => chain as Chain);
  chain.insert = jest.fn(() => chain as Chain);
  chain.update = jest.fn(() => chain as Chain);
  chain.delete = jest.fn(() => chain as Chain);
  chain.eq = jest.fn(() => chain as Chain);
  chain.order = jest.fn().mockResolvedValue(resolved);
  chain.single = jest.fn().mockResolvedValue(resolved);
  return chain as Chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listServiceCatalog', () => {
  it('returns active services from the catalog', async () => {
    const rows = [
      {
        id: 's1',
        slug: 'plumbing-general',
        name: 'General Plumbing',
        category: 'Plumbing',
        base_rate: 500,
      },
    ];
    const chain = makeChain({ data: rows, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await listServiceCatalog();
    expect(mockFrom).toHaveBeenCalledWith('services');
    expect(result).toEqual(rows);
  });

  it('throws on error', async () => {
    const chain = makeChain({ data: null, error: { message: 'db down' } });
    mockFrom.mockReturnValue(chain);

    await expect(listServiceCatalog()).rejects.toThrow('Failed to fetch service catalog');
  });
});

describe('listHandymanServices', () => {
  it('returns the handyman services joined with the catalog', async () => {
    const rows = [
      {
        handyman_id: 'hm-1',
        service_id: 's1',
        price_override: 600,
        created_at: '2026-07-01T00:00:00.000Z',
        service: {
          id: 's1',
          slug: 'plumbing-general',
          name: 'General Plumbing',
          category: 'Plumbing',
          base_rate: 500,
        },
      },
      {
        handyman_id: 'hm-1',
        service_id: 's2',
        price_override: null,
        created_at: '2026-07-02T00:00:00.000Z',
        service: {
          id: 's2',
          slug: 'electrical-wiring',
          name: 'Wiring & Installation',
          category: 'Electrical',
          base_rate: 800,
        },
      },
      {
        handyman_id: 'hm-1',
        service_id: 's3',
        price_override: 250,
        created_at: '2026-07-03T00:00:00.000Z',
        service: {
          id: 's3',
          slug: 'cleaning-general',
          name: 'General Cleaning',
          category: 'Cleaning',
          base_rate: 350,
        },
      },
    ];
    const chain = makeChain({ data: rows, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await listHandymanServices('hm-1');

    expect(mockFrom).toHaveBeenCalledWith('handyman_services');
    expect(chain.eq).toHaveBeenCalledWith('handyman_id', 'hm-1');
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.service.category)).toEqual(['Plumbing', 'Electrical', 'Cleaning']);
    expect(result[0].price_override).toBe(600);
    expect(result[1].price_override).toBeNull();
    expect(result[2].price_override).toBe(250);
  });

  it('throws on error', async () => {
    const chain = makeChain({ data: null, error: { message: 'db down' } });
    mockFrom.mockReturnValue(chain);

    await expect(listHandymanServices('hm-1')).rejects.toThrow('Failed to fetch handyman services');
  });
});

describe('addHandymanService', () => {
  it('inserts a new row scoped to the handyman', async () => {
    const row = {
      handyman_id: 'hm-1',
      service_id: 's1',
      price_override: 550,
      created_at: '2026-07-15T00:00:00.000Z',
      service: {
        id: 's1',
        slug: 'plumbing-general',
        name: 'General Plumbing',
        category: 'Plumbing',
        base_rate: 500,
      },
    };
    const chain = makeChain({ data: row, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await addHandymanService('hm-1', 's1', 550);

    expect(chain.insert).toHaveBeenCalledWith({
      handyman_id: 'hm-1',
      service_id: 's1',
      price_override: 550,
    });
    expect(result).toEqual(row);
  });

  it('defaults price_override to null when omitted', async () => {
    const chain = makeChain({ data: {}, error: null });
    mockFrom.mockReturnValue(chain);

    await addHandymanService('hm-1', 's1');

    expect(chain.insert).toHaveBeenCalledWith({
      handyman_id: 'hm-1',
      service_id: 's1',
      price_override: null,
    });
  });

  it('throws on error', async () => {
    const chain = makeChain({ data: null, error: { message: 'duplicate key' } });
    mockFrom.mockReturnValue(chain);

    await expect(addHandymanService('hm-1', 's1')).rejects.toThrow('Failed to add service');
  });
});

describe('updateServicePrice', () => {
  it('updates the price for the caller-service pair', async () => {
    const chain = makeChain({ data: { service_id: 's1', price_override: 700 }, error: null });
    mockFrom.mockReturnValue(chain);

    await updateServicePrice('hm-1', 's1', 700);

    expect(chain.update).toHaveBeenCalledWith({ price_override: 700 });
    expect(chain.eq).toHaveBeenCalledWith('handyman_id', 'hm-1');
    expect(chain.eq).toHaveBeenCalledWith('service_id', 's1');
  });

  it('throws on error', async () => {
    const chain = makeChain({ data: null, error: { message: 'not found' } });
    mockFrom.mockReturnValue(chain);

    await expect(updateServicePrice('hm-1', 's1', 700)).rejects.toThrow(
      'Failed to update service price'
    );
  });
});

describe('removeHandymanService', () => {
  it('deletes the caller-service pair', async () => {
    const chain: Partial<Chain> = {
      delete: jest.fn(),
      eq: jest.fn(),
    };
    (chain.delete as jest.Mock).mockReturnValue(chain);
    (chain.eq as jest.Mock).mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null });
    mockFrom.mockReturnValue(chain);

    await expect(removeHandymanService('hm-1', 's1')).resolves.toBeUndefined();
    expect(chain.delete).toHaveBeenCalled();
  });

  it('throws on error', async () => {
    const chain: Partial<Chain> = {
      delete: jest.fn(),
      eq: jest.fn(),
    };
    (chain.delete as jest.Mock).mockReturnValue(chain);
    (chain.eq as jest.Mock)
      .mockReturnValueOnce(chain)
      .mockResolvedValueOnce({ error: { message: 'fk violation' } });
    mockFrom.mockReturnValue(chain);

    await expect(removeHandymanService('hm-1', 's1')).rejects.toThrow('Failed to remove service');
  });
});
