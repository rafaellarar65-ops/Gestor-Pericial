import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/state';
import type { EmailConfigPayload } from '@/services/email-inbox-service';

type EmailConfigProps = {
  value: EmailConfigPayload;
  onChange: (next: EmailConfigPayload) => void;
  onSave: () => void;
  isSaving: boolean;
  saveError: boolean;
};

export function EmailConfig({ value, onChange, onSave, isSaving, saveError }: EmailConfigProps) {
  const updateField = <K extends keyof EmailConfigPayload>(field: K, fieldValue: EmailConfigPayload[K]) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <Card className="p-4 space-y-3">
      <h2 className="font-semibold">Configuração de email</h2>
      <div className="grid gap-2 md:grid-cols-2">
        <Input placeholder="Remetente (email)" value={value.fromEmail} onChange={(event) => updateField('fromEmail', event.target.value)} />
        <Input placeholder="Nome do remetente" value={value.fromName} onChange={(event) => updateField('fromName', event.target.value)} />
        <Input placeholder="SMTP host" value={value.smtpHost} onChange={(event) => updateField('smtpHost', event.target.value)} />
        <Input placeholder="SMTP port" value={value.smtpPort} onChange={(event) => updateField('smtpPort', event.target.value)} />
        <Input placeholder="Login" value={value.login} onChange={(event) => updateField('login', event.target.value)} />
        <Input placeholder="Senha" type="password" value={value.password} onChange={(event) => updateField('password', event.target.value)} />
        <Input placeholder="IMAP host" value={value.imapHost} onChange={(event) => updateField('imapHost', event.target.value)} />
        <Input placeholder="IMAP port" value={value.imapPort} onChange={(event) => updateField('imapPort', event.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={value.secure} onChange={(event) => updateField('secure', event.target.checked)} />
        Conexão segura (TLS)
      </label>
      {saveError && <ErrorState message="Falha ao salvar configuração de email." />}
      <Button onClick={onSave} disabled={isSaving || !value.fromEmail || !value.smtpHost || !value.login || !value.password}>
        {isSaving ? 'Salvando...' : 'Salvar configuração'}
      </Button>
    </Card>
  );
}
