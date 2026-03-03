import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { TabCsv } from './importacoes/tab-csv';
import { TabHistory } from './importacoes/tab-history';
import { TabPrint } from './importacoes/tab-print';
import { TabSingle } from './importacoes/tab-single';

type TabId = 'print' | 'csv' | 'single' | 'history';

const TAB_IDS: TabId[] = ['print', 'csv', 'single', 'history'];

const ImportacoesPage = () => {
  const [activeTab, setActiveTab] = useState<TabId>('print');

  const [printState, setPrintState] = useState({
    printerName: '',
    copies: '1',
    includeSummary: true,
  });

  const [csvState, setCsvState] = useState({
    selectedFile: null as File | null,
    validationMessages: [] as string[],
    previewRows: [] as string[][],
    isProcessing: false,
    progress: 0,
  });

  const [singleState, setSingleState] = useState({
    processNumber: '',
    protocolCode: '',
    notes: '',
  });

  const [historyState, setHistoryState] = useState({
    searchTerm: '',
    items: [
      {
        id: 'h-1',
        description: 'Lote de recebimentos do TJSP - Fevereiro',
        importedAt: '2026-02-10T14:20:00.000Z',
        status: 'CONCLUIDO' as const,
      },
      {
        id: 'h-2',
        description: 'Importação unitária de protocolo PROTOC-2026-0007',
        importedAt: '2026-02-14T09:15:00.000Z',
        status: 'EM_ANALISE' as const,
      },
    ],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importações Financeiras</h1>
        <p className="text-sm text-muted-foreground">
          Selecione um modo de importação para processar arquivos, registros unitários ou revisar o
          histórico.
        </p>
      </div>

      <Tabs tabs={TAB_IDS} activeTab={activeTab} onChange={(tab) => setActiveTab(tab as TabId)} />

      <div className="space-y-4">
        <div className={activeTab === 'print' ? 'block' : 'hidden'}>
          <TabPrint state={printState} onChange={setPrintState} />
        </div>
        <div className={activeTab === 'csv' ? 'block' : 'hidden'}>
          <TabCsv state={csvState} onChange={setCsvState} />
        </div>
        <div className={activeTab === 'single' ? 'block' : 'hidden'}>
          <TabSingle state={singleState} onChange={setSingleState} />
        </div>
        <div className={activeTab === 'history' ? 'block' : 'hidden'}>
          <TabHistory state={historyState} onChange={setHistoryState} />
        </div>
      </div>
    </div>
  );
};

export default ImportacoesPage;
