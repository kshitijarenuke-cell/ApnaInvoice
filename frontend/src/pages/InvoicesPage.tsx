import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useInvoiceRole } from '../contexts/InvoiceRoleContext';
import TabbedRightPane from '../components/invoices/TabbedRightPane';

const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const { invoiceRole, isUser, setInvoiceRole } = useInvoiceRole();

  // Admin-only page: auto-set provider role for invoice management when none is set
  useEffect(() => {
    if (!invoiceRole && user?.role === 'admin') {
      setInvoiceRole('provider');
    }
  }, [invoiceRole, user?.role, setInvoiceRole]);

  if (!invoiceRole) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto">
      {/* Header with Role Indicator and Settings Button */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between flex-shrink-0 rounded-t-xl shadow-sm">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isUser ? 'Invoices' : 'Invoice Creator'}
          </h1>
    
        </div>
      </div>

      {/* Centered Content */}
      <div className="bg-white dark:bg-gray-800 border-l border-r border-b border-gray-200 dark:border-gray-700 rounded-b-xl shadow-sm">
        <TabbedRightPane />
      </div>
    </div>
  );
};

export default InvoicesPage;
