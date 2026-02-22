import { Card } from '@/components/ui/card';

export const LoadingState = () => <Card>Carregando dados...</Card>;

export const ErrorState = ({ message }: { message: string }) => <Card>Erro: {message}</Card>;

export const EmptyState = ({ title }: { title: string }) => <Card>{title}</Card>;
