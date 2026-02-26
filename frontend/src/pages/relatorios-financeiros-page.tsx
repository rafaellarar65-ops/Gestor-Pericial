import { DomainPageTemplate } from '@/components/domain/domain-page-template';
import { useDomainData } from '@/hooks/use-domain-data';

const Page = () => {
  const { data = [], isLoading, isError } = useDomainData('relatorios-financeiros', '/financial/recebimentos');

  return (
    <DomainPageTemplate
      description="Painel de análise e relatórios financeiros com visão consolidada dos recebimentos."
      isError={isError}
      isLoading={isLoading}
      items={data}
      renderItem={(item, index) => (
        <div className="rounded border p-2" key={index}>
          {Object.entries(item).map(([key, value]) => (
            <p className="text-sm" key={key}>
              <strong>{key}:</strong> {String(value ?? '-')}
            </p>
          ))}
        </div>
      )}
      title="Relatórios Financeiros"
    />
  );
};

export default Page;
