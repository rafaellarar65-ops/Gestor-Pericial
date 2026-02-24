import { apiClient } from '@/lib/api-client';
import type { EmailTemplate, Lawyer } from '@/types/api';

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
