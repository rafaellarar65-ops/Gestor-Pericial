import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSmartCompletion } from '@/hooks/use-smart-completion';
import { laudoInteligenteService } from '@/services/laudo-inteligente-service';

const LaudoInteligentePage = () => {
  const { id = '' } = useParams();
  const [nomePericiado, setNomePericiado] = useState('');
  const [exameFisico, setExameFisico] = useState('');
  const [discussao, setDiscussao] = useState('');
  const [processoJson, setProcessoJson] = useState<Record<string, unknown>>({});
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  const contexto = useMemo(() => ({ processoJson, nomePericiado }), [processoJson, nomePericiado]);

  const exameCompletion = useSmartCompletion({ periciaId: id, campo: 'exameFisico', textoAtual: exameFisico, contexto });
  const discussaoCompletion = useSmartCompletion({ periciaId: id, campo: 'discussao', textoAtual: discussao, contexto });

  const onExtract = async () => {
    if (!id || !pdfFile) return;
    const extracted = await laudoInteligenteService.extract(id, pdfFile);
    setProcessoJson(extracted.dadosProcesso ?? {});
    setNomePericiado(String(extracted.dadosProcesso?.nomePericiado ?? ''));
  };

  const onReprocess = async () => {
    if (!id) return;
    const result = await laudoInteligenteService.reprocess(id, {
      exameFisicoTexto: exameFisico,
      imagensBase64: [],
    });
    setDiscussao(result.discussaoTecnica);
  };

  const onGenerateReport = async () => {
    if (!id) return;
    if (templateFile) await laudoInteligenteService.uploadTemplate(id, templateFile);
    await laudoInteligenteService.generateReport(id, { nomePericiado, exameFisico, discussao });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Módulo de Edição de Laudo Inteligente</h1>
      <Card className="space-y-3 p-4">
        <p className="text-sm font-medium">1) Extração inicial do PDF (Viagem 1)</p>
        <Input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
        <Button onClick={onExtract}>Extrair Processo</Button>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-medium">Dados principais</p>
        <Input value={nomePericiado} onChange={(e) => setNomePericiado(e.target.value)} placeholder="Nome do periciado" />
      </Card>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-medium">2) Exame Físico com autocomplete técnico</p>
        <div className="relative">
          <textarea
            className="min-h-40 w-full rounded-md border p-3 font-mono"
            value={exameFisico}
            onChange={(e) => setExameFisico(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && exameCompletion.ghostText) {
                e.preventDefault();
                setExameFisico(exameCompletion.acceptWithTab());
              }
            }}
          />
          {exameCompletion.ghostText && (
            <div className="pointer-events-none absolute inset-0 p-3 font-mono text-slate-400">
              <span className="opacity-0">{exameFisico}</span>
              <span>{exameCompletion.ghostText}</span>
            </div>
          )}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-medium">3) Discussão Técnica + Reprocessar análise multimodal</p>
        <div className="relative">
          <textarea
            className="min-h-40 w-full rounded-md border p-3 font-mono"
            value={discussao}
            onChange={(e) => setDiscussao(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && discussaoCompletion.ghostText) {
                e.preventDefault();
                setDiscussao(discussaoCompletion.acceptWithTab());
              }
            }}
          />
          {discussaoCompletion.ghostText && (
            <div className="pointer-events-none absolute inset-0 p-3 font-mono text-slate-400">
              <span className="opacity-0">{discussao}</span>
              <span>{discussaoCompletion.ghostText}</span>
            </div>
          )}
        </div>
        <Button onClick={onReprocess}>Reprocessar Análise</Button>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-medium">4) Template DOCX e geração final de PDF</p>
        <Input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)} />
        <Button onClick={onGenerateReport}>Gerar Laudo Final</Button>
      </Card>
    </div>
  );
};

export default LaudoInteligentePage;
