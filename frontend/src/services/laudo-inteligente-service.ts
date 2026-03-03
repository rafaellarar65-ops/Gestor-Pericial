import { apiClient } from '@/lib/api-client';

export interface ExtractResponse {
  dadosProcesso: Record<string, unknown>;
  manobrasFisicasIniciais: string[];
}

export const laudoInteligenteService = {
  async extract(periciaId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<ExtractResponse>(`/api/pericia/extract/${periciaId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async reprocess(periciaId: string, payload: { exameFisicoTexto: string; imagensBase64: string[] }) {
    const { data } = await apiClient.post<{ discussaoTecnica: string }>(`/api/pericia/reprocess/${periciaId}`, payload);
    return data;
  },

  async uploadTemplate(periciaId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<{ templateDocxPath: string }>(`/api/pericia/template/${periciaId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async generateReport(periciaId: string, payload: { nomePericiado?: string; exameFisico?: string; discussao?: string }) {
    const { data } = await apiClient.post<{ pdfPath: string }>(`/api/pericia/generate-report/${periciaId}`, payload);
    return data;
  },
};
