import React from 'react';
import { Navigate } from 'react-router-dom';
import { useInvoiceRole } from '../../contexts/InvoiceRoleContext';

interface InvoiceRouteGuardProps {
  children: React.ReactNode;
  requireProvider?: boolean;
}

const InvoiceRouteGuard: React.FC<InvoiceRouteGuardProps> = ({ 
  children, 
  requireProvider = false 
}) => {
  const { invoiceRole, isProvider } = useInvoiceRole();

  // If no role selected, redirect to invoice page (which will show role selector)
  if (!invoiceRole) {
    return <Navigate to="/admin/invoices" replace />;
  }

  // If route requires provider but user is not provider, redirect
  if (requireProvider && !isProvider) {
    return <Navigate to="/admin/invoices" replace />;
  }

  return <>{children}</>;
};

export default InvoiceRouteGuard;

