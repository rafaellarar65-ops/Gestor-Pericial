import { apiClient } from '@/lib/api-client';

export type EmailInboxFilterType = 'nao_confirmados' | 'pediram_reagendamento' | 'falha_envio' | 'optin_pendente' | 'inbound_nao_vinculado' | '';

export type EmailConfigPayload = {
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: string;
  login: string;
  password: string;
  imapHost: string;
  imapPort: string;
  secure: boolean;
};

export type EmailConfigResponse = {
  id: string;
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  secure: boolean;
  active: boolean;
};

export type EmailAttachment = {
  id: string;
  name: string;
  size?: number;
  mimeType?: string;
  downloadUrl?: string;
};

export type EmailListItem = {
  id: string;
  uid: string;
  from?: string;
  to?: string;
  subject?: string;
  snippet?: string;
  status?: string;
  message?: string;
  body?: string;
  tags: string[];
  channel?: string;
  createdAt?: string;
  isRead: boolean;
  attachments: EmailAttachment[];
};

export type EmailInboxListParams = {
  page: number;
  limit: number;
  search?: string;
  filter?: Exclude<EmailInboxFilterType, ''>;
};

export type EmailInboxListResponse = {
  items: EmailListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ReplyEmailPayload = {
  uid: string;
  to: string;
  subject: string;
  body: string;
};

const toEmailListItem = (item: Record<string, unknown>): EmailListItem => {
  const id = typeof item.id === 'string' ? item.id : '';
  const uid = typeof item.uid === 'string' ? item.uid : id;

  const tags = Array.isArray(item.tags)
    ? item.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];

  const attachments: EmailAttachment[] = Array.isArray(item.attachments)
    ? item.attachments
        .map((attachment): EmailAttachment | null => {
          if (!attachment || typeof attachment !== 'object') {
            return null;
          }

          const raw = attachment as Record<string, unknown>;
          if (typeof raw.id !== 'string' || typeof raw.name !== 'string') {
            return null;
          }

          return {
            id: raw.id,
            name: raw.name,
            size: typeof raw.size === 'number' ? raw.size : undefined,
            mimeType: typeof raw.mimeType === 'string' ? raw.mimeType : undefined,
            downloadUrl: typeof raw.downloadUrl === 'string' ? raw.downloadUrl : undefined,
          };
        })
        .filter((attachment): attachment is EmailAttachment => attachment !== null)
    : [];

  return {
    id,
    uid,
    from: typeof item.from === 'string' ? item.from : undefined,
    to: typeof item.to === 'string' ? item.to : undefined,
    subject: typeof item.subject === 'string' ? item.subject : undefined,
    snippet: typeof item.snippet === 'string' ? item.snippet : undefined,
    status: typeof item.status === 'string' ? item.status : undefined,
    message: typeof item.message === 'string' ? item.message : undefined,
    body: typeof item.body === 'string' ? item.body : undefined,
    tags,
    channel: typeof item.channel === 'string' ? item.channel : undefined,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined,
    isRead: Boolean(item.isRead),
    attachments,
  };
};

export const emailInboxService = {
  saveConfig: async (payload: EmailConfigPayload): Promise<EmailConfigResponse> => {
    const { data } = await apiClient.post<EmailConfigResponse>('/communications/uolhost/config', payload);
    return data;
  },

  listInbox: async (params: EmailInboxListParams): Promise<EmailInboxListResponse> => {
    const { data } = await apiClient.get<unknown>('/communications/inbox', {
      params: {
        filter: params.filter,
        search: params.search,
        page: params.page,
        limit: params.limit,
      },
    });

    if (Array.isArray(data)) {
      const items = data
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .map(toEmailListItem);
      const start = (params.page - 1) * params.limit;
      const paginatedItems = items.slice(start, start + params.limit);

      return {
        items: paginatedItems,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: items.length,
          totalPages: Math.max(1, Math.ceil(items.length / params.limit)),
        },
      };
    }

    if (!data || typeof data !== 'object') {
      return {
        items: [],
        pagination: { page: params.page, limit: params.limit, total: 0, totalPages: 1 },
      };
    }

    const raw = data as {
      items?: unknown;
      pagination?: { page?: number; limit?: number; total?: number; totalPages?: number };
    };

    const items = Array.isArray(raw.items)
      ? raw.items
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
          .map(toEmailListItem)
      : [];

    return {
      items,
      pagination: {
        page: raw.pagination?.page ?? params.page,
        limit: raw.pagination?.limit ?? params.limit,
        total: raw.pagination?.total ?? items.length,
        totalPages: raw.pagination?.totalPages ?? Math.max(1, Math.ceil((raw.pagination?.total ?? items.length) / params.limit)),
      },
    };
  },

  getEmailByUid: async (uid: string): Promise<EmailListItem | null> => {
    const { data } = await apiClient.get<unknown>('/communications/inbox', { params: { uid } });

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return toEmailListItem(data as Record<string, unknown>);
    }

    if (!Array.isArray(data)) {
      return null;
    }

    const found = data.find((item) => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const record = item as Record<string, unknown>;
      return record.uid === uid || record.id === uid;
    });

    if (!found || typeof found !== 'object') {
      return null;
    }

    return toEmailListItem(found as Record<string, unknown>);
  },

  sendReply: async (payload: ReplyEmailPayload): Promise<{ queued: boolean }> => {
    const { data } = await apiClient.post<{ queued: boolean }>('/communications/email-send', {
      to: payload.to,
      subject: payload.subject,
      html: payload.body,
      inReplyToUid: payload.uid,
    });
    return data;
  },

  markAsRead: async (uid: string): Promise<{ updated: number }> => {
    const { data } = await apiClient.post<{ updated: number }>('/communications/inbox/actions/mark-read', { uid });
    return data;
  },
};
