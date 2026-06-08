import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen dark:bg-gray-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !hasRole(...roles)) return <Navigate to="/" replace />;

  return (
    <Layout>
      {children}
    </Layout>
  );
}
