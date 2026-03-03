import { Navigate } from 'react-router-dom';
import { appPaths } from '@/config/sidebar-config';

const AgendarLotePage = () => <Navigate replace to={appPaths.agendar} />;

export default AgendarLotePage;
