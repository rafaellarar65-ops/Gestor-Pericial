import { useState } from 'react';
import { Book, ChevronDown, ChevronRight, ExternalLink, HelpCircle, Zap, Shield, BarChart2, FileText, Calendar, MessageCircle, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';

type DocSection = {
  title: string;
  icon: React.ReactNode;
  items: { title: string; description: string; tips?: string[] }[];
};

const DOCS: DocSection[] = [
  {
    title: 'Início Rápido',
    icon: <Zap className="h-4 w-4 text-yellow-500" />,
    items: [
      {
        title: 'Configuração Inicial',
        description: 'Para começar, vá em Configurações e cadastre as Cidades, Varas, Status e Tipos de Perícia. Esses dados são usados em todo o sistema.',
        tips: ['Cadastre as cidades antes das varas', 'Defina os status de perícia com códigos únicos', 'Use cores nos status para facilitar a identificação visual'],
      },
      {
        title: 'Primeiro Login',
        description: 'Entre com seu e-mail e senha cadastrados. O sistema utiliza JWT com renovação automática a cada 15 minutos.',
        tips: ['Guarde suas credenciais em local seguro', 'A sessão expira após 7 dias de inatividade'],
      },
    ],
  },
  {
    title: 'Módulo de Perícias',
    icon: <FileText className="h-4 w-4 text-blue-500" />,
    items: [
      {
        title: 'Criar Nova Perícia',
        description: 'Acesse /pericias/nova. O número CNJ é obrigatório. Preencha os dados da nomeação, cidade, vara e honorários previstos.',
        tips: ['Formato CNJ: 0000000-00.0000.0.00.0000', 'Honorários em valor bruto (R$)', 'Vincule a uma vara já cadastrada para melhor controle'],
      },
      {
        title: 'Detalhe da Perícia (360°)',
        description: 'Clique em qualquer perícia para ver a visão completa: datas, documentos, timeline de eventos, financeiro e dados CNJ.',
        tips: ['Use "Editar Datas" para registrar marcos importantes', '"Laudo Enviado" registra a data de protocolo', 'A aba Financeiro mostra honorários previstos vs. recebidos'],
      },
      {
        title: 'Importação em Massa',
        description: 'Use /importacoes para fazer upload de planilhas CSV/XLSX com múltiplas perícias. O sistema valida e importa automaticamente.',
        tips: ['Limite: 10 MB por arquivo', 'Formato aceito: .csv ou .xlsx', 'Confira o relatório de importação após o processamento'],
      },
    ],
  },
  {
    title: 'Agenda e Agendamento',
    icon: <Calendar className="h-4 w-4 text-pink-500" />,
    items: [
      {
        title: 'Fila de Agendamento',
        description: 'Na Fila de Agendamento, selecione múltiplas perícias e aplique data e hora em lote com um único clique.',
        tips: ['Selecione múltiplas perícias com o checkbox', 'Defina data e hora antes de confirmar', 'Funciona apenas em perícias sem data agendada'],
      },
      {
        title: 'Agenda de Eventos',
        description: 'A Agenda exibe todos os eventos operacionais: perícias, prazos, laudos e deslocamentos.',
        tips: ['Use o filtro de data para navegar no calendário', 'Eventos com status "cancelado" são exibidos em vermelho'],
      },
    ],
  },
  {
    title: 'Financeiro',
    icon: <BarChart2 className="h-4 w-4 text-emerald-500" />,
    items: [
      {
        title: 'Recebimentos',
        description: 'O módulo Financeiro (Análise Financeira) lista todos os recebimentos vinculados às perícias por fonte de pagamento.',
        tips: ['Fontes: TJ, Parte Autora, Parte Ré, Seguradora', 'Filtre por período para gerar relatórios mensais'],
      },
      {
        title: 'Gestão de Despesas',
        description: 'Em Despesas, registre gastos operacionais por categoria: escritório, deslocamento, equipamento, pessoal, impostos.',
        tips: ['Vincule despesas a uma perícia específica (opcional)', 'Use a data de competência para controle mensal'],
      },
      {
        title: 'Central de Cobrança',
        description: 'A tela de Cobrança agrupa processos com pagamento pendente por cidade, facilitando o acompanhamento.',
        tips: ['Perícias com status "Atrasado" aparecem em destaque', 'Use o botão de cobrança automática por vara'],
      },
    ],
  },
  {
    title: 'Comunicação',
    icon: <MessageCircle className="h-4 w-4 text-cyan-500" />,
    items: [
      {
        title: 'E-mail Integrado',
        description: 'Sincronize sua caixa de entrada IMAP em Inbox de E-mail. Configure as credenciais em Comunicação > Configuração Uolhost.',
        tips: ['Suporte a IMAP + SMTP', 'Sincronização manual ou automática', 'Templates de e-mail pré-configurados disponíveis'],
      },
      {
        title: 'Templates de E-mail',
        description: 'Em Comunicação, gerencie templates HTML reutilizáveis para cobranças, esclarecimentos e notificações.',
        tips: ['Use variáveis {{\$nome}}, {{\$processo}}, {{\$valor}} nos templates', 'Teste antes de enviar em massa'],
      },
    ],
  },
  {
    title: 'Segurança e Permissões',
    icon: <Shield className="h-4 w-4 text-slate-500" />,
    items: [
      {
        title: 'Papéis de Usuário',
        description: 'O sistema possui 3 papéis: ADMIN (acesso total), ASSISTANT (operacional) e REVIEWER (leitura e revisão).',
        tips: ['Apenas ADMIN pode alterar papéis de outros usuários', 'Funções de importação e batch-update são restritas ao ADMIN'],
      },
      {
        title: 'Autenticação JWT',
        description: 'O token de acesso expira em 15 minutos e é renovado automaticamente. A sessão completa dura 7 dias.',
        tips: ['Em caso de problema, faça logout e login novamente', 'Não compartilhe tokens de acesso'],
      },
    ],
  },
  {
    title: 'Suporte Técnico',
    icon: <Settings className="h-4 w-4 text-purple-500" />,
    items: [
      {
        title: 'API e Integração',
        description: 'O backend expõe documentação Swagger em /api. Útil para integrações e debug.',
        tips: ['Acesse: https://gestor-pericial-production.up.railway.app/api', 'Autentique-se com Bearer token para testar endpoints'],
      },
    ],
  },
];

const Page = () => {
  const [expanded, setExpanded] = useState<string | null>('Início Rápido');

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-100 p-2">
          <Book className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Documentação</h1>
          <p className="text-sm text-muted-foreground">Guia completo do Gestor Pericial — funcionalidades, fluxos e boas práticas.</p>
        </div>
      </header>

      {/* Quick links */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <a
            href="https://gestor-pericial-production.up.railway.app/api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            <ExternalLink className="h-3.5 w-3.5" /> API Swagger
          </a>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
            <HelpCircle className="h-3.5 w-3.5" /> Backend: Railway
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
            <HelpCircle className="h-3.5 w-3.5" /> DB: Neon PostgreSQL
          </span>
        </div>
      </Card>

      {/* Sections */}
      <div className="space-y-2">
        {DOCS.map((section) => {
          const isOpen = expanded === section.title;
          return (
            <Card key={section.title} className="overflow-hidden">
              <button
                className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50"
                onClick={() => setExpanded(isOpen ? null : section.title)}
                type="button"
              >
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  {section.icon}
                  {section.title}
                </div>
                {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>

              {isOpen && (
                <div className="border-t">
                  {section.items.map((item, idx) => (
                    <div key={item.title} className={`p-4 ${idx > 0 ? 'border-t' : ''}`}>
                      <h3 className="mb-1 font-semibold text-slate-800">{item.title}</h3>
                      <p className="mb-2 text-sm text-slate-600">{item.description}</p>
                      {item.tips && item.tips.length > 0 && (
                        <ul className="space-y-1">
                          {item.tips.map((tip) => (
                            <li key={tip} className="flex items-start gap-1.5 text-xs text-slate-500">
                              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Page;
