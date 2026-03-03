import { apiClient } from '@/lib/api-client';
export const AI_PROMPT_TYPES = {
  PRE_LAUDO: 'PRE_LAUDO',
  SUMMARY: 'SUMMARY',
  LAWYERS: 'LAWYERS',
} as const;

export type AiPromptType = (typeof AI_PROMPT_TYPES)[keyof typeof AI_PROMPT_TYPES];

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Falha ao converter áudio para base64.'));
        return;
      }

      const [, base64] = result.split(',', 2);
      resolve(base64 ?? result);
    };
    reader.onerror = () => reject(new Error('Falha ao converter áudio para base64.'));
    reader.readAsDataURL(blob);
  });

export const aiService = {
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    const base64 = await blobToBase64(audioBlob);
    const res = await apiClient.post<{ text: string }>('/ai/transcribe-audio', { audio: base64 });
    return res.data.text;
  },

  async analyzePdf(documentId: string, promptType: AiPromptType): Promise<Record<string, unknown>> {
    const res = await apiClient.post<Record<string, unknown>>('/ai/analyze-pdf', {
      documentId,
      promptType,
    });
    return res.data;
  },
};
