import { DomainPageTemplate } from '@/components/domain/domain-page-template';
import { useDomainData } from '@/hooks/use-domain-data';

const Page = () => {
  const { data = [], isLoading, isError } = useDomainData('laudo-v2', '/laudo-v2');

  return (
    <DomainPageTemplate
      description="Página implementada na fase 4 com estados padrão e integração API."
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
      title="laudo-v2"
    />
  );
};

export default Page;
