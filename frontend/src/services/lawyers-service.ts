import { apiClient } from '@/lib/api-client';
import type { EmailTemplate, InboxItem, Lawyer, MessageTemplate, MessageTemplateChannel, TemplatePreview } from '@/types/api';

export const lawyersService = {
  list: async (): Promise<Lawyer[]> => {
    const { data } = await apiClient.get<Lawyer[]>('/communications/lawyers');
    return Array.isArray(data) ? data : [];
  },

  create: async (payload: {
    nome: string;
    oab?: string;
    ufOab?: string;
    email?: string;
    telefone?: string;
    observacoes?: string;
  }): Promise<Lawyer> => {
    const { data } = await apiClient.post<Lawyer>('/communications/lawyers', payload);
    return data;
  },
};

export const templatesService = {
  list: async (): Promise<EmailTemplate[]> => {
    const { data } = await apiClient.get<EmailTemplate[]>('/communications/templates');
    return Array.isArray(data) ? data : [];
  },

  create: async (payload: {
    key: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    variables?: string[];
  }): Promise<EmailTemplate> => {
    const { data } = await apiClient.post<EmailTemplate>('/communications/templates', payload);
    return data;
  },

  sendEmail: async (payload: { to: string; subject: string; html: string }): Promise<{ sent: boolean }> => {
    const { data } = await apiClient.post<{ sent: boolean }>('/communications/email-send', payload);
    return data;
  },
};

export const messageTemplatesService = {
  list: async (channel?: MessageTemplateChannel): Promise<MessageTemplate[]> => {
    const { data } = await apiClient.get<MessageTemplate[]>('/communications/message-templates', { params: channel ? { channel } : undefined });
    return Array.isArray(data) ? data : [];
  },

  create: async (payload: Omit<MessageTemplate, 'id'>): Promise<MessageTemplate> => {
    const { data } = await apiClient.post<MessageTemplate>('/communications/message-templates', payload);
    return data;
  },

  update: async (id: string, payload: Partial<Omit<MessageTemplate, 'id'>>): Promise<MessageTemplate> => {
    const { data } = await apiClient.patch<MessageTemplate>(`/communications/message-templates/${id}`, payload);
    return data;
  },

  remove: async (id: string): Promise<{ deleted: boolean }> => {
    const { data } = await apiClient.delete<{ deleted: boolean }>(`/communications/message-templates/${id}`);
    return data;
  },

  preview: async (id: string, payload: { periciaId?: string }): Promise<TemplatePreview> => {
    const { data } = await apiClient.post<TemplatePreview>(`/communications/templates/${id}/preview`, payload);
    return data;
  },
};

export const communicationInboxService = {
  list: async (filter?: string): Promise<InboxItem[]> => {
    const { data } = await apiClient.get<InboxItem[]>('/communications/inbox', { params: filter ? { filter } : undefined });
    return Array.isArray(data) ? data : [];
  },

  resendTemplate: async (payload: { messageIds: string[]; templateId: string }): Promise<{ resent: number }> => {
    const { data } = await apiClient.post<{ resent: number }>('/communications/inbox/actions/resend-template', payload);
    return data;
  },

  grantOptIn: async (payload: { messageIds: string[] }): Promise<{ updated: number }> => {
    const { data } = await apiClient.post<{ updated: number }>('/communications/inbox/actions/grant-optin', payload);
    return data;
  },

  linkInbound: async (payload: { messageIds: string[]; periciaId?: string; processoId?: string }): Promise<{ linked: number }> => {
    const { data } = await apiClient.post<{ linked: number }>('/communications/inbox/actions/link-inbound', payload);
    return data;
  },
};
