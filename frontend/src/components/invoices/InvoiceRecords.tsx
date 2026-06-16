import React, { useEffect, useState } from 'react';
import { Eye, Download, Edit, Trash2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchUserInvoices,
  fetchInvoiceById,
  deleteInvoiceById,
  InvoiceListItem,
} from '../../services/invoiceListService';
import { formatCurrency } from '../../utils/currencyFormatter';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { useInvoiceStore } from '../../store/invoiceStore';
import dayjs from 'dayjs';

interface InvoiceRecordsProps {
  refreshTrigger?: number;
  onSwitchToPreview?: () => void;
}

const InvoiceRecords: React.FC<InvoiceRecordsProps> = ({
  refreshTrigger,
  onSwitchToPreview,
}) => {
  const { user } = useAuth();
  const loadInvoice = useInvoiceStore((state) => state.loadInvoice);

  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
const [searchInvoiceNumber, setSearchInvoiceNumber] = useState('');
const [searchClientName, setSearchClientName] = useState('');
const [searchDate, setSearchDate] = useState('');

  const loadInvoices = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const invoiceRole = sessionStorage.getItem('invoice_role');
      const data = await fetchUserInvoices(
        user.id,
        user.email,
        invoiceRole === 'user' ? 'user' : undefined
      );

      setInvoices(data);
    } catch (err) {
      console.error('Error loading invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshTrigger]);

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('MM/DD/YYYY');
  };

const filteredInvoices = invoices.filter((invoice) => {
  const invoiceNumberMatch = invoice.number
    ?.toLowerCase()
    .includes(searchInvoiceNumber.toLowerCase());

  const clientNameMatch = invoice.bill_to_name
    ?.toLowerCase()
    .includes(searchClientName.toLowerCase());

  const dateMatch = searchDate
    ? dayjs(invoice.issue_date).format('YYYY-MM-DD') === searchDate
    : true;

  return invoiceNumberMatch && clientNameMatch && dateMatch;
});

const clearFilters = () => {
  setSearchInvoiceNumber('');
  setSearchClientName('');
  setSearchDate('');
};

  const handleOpenInvoice = async (invoice: InvoiceListItem) => {
    if (!user) return;

    setProcessingId(invoice.id);

    try {
      toast.loading('Loading invoice...', { id: 'load-invoice' });

      const fullInvoice = await fetchInvoiceById(invoice.id, user.id, user.email);
      loadInvoice(fullInvoice);

      toast.success('Invoice loaded!', { id: 'load-invoice' });

      if (onSwitchToPreview) {
        onSwitchToPreview();
      }
    } catch (err) {
      console.error('Error loading invoice:', err);
      toast.error('Failed to load invoice. Please try again.', { id: 'load-invoice' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleEditInvoice = async (invoice: InvoiceListItem) => {
    if (!user) return;

    setProcessingId(invoice.id);

    try {
      toast.loading('Loading invoice for edit...', { id: 'edit-invoice' });

      const invoiceRole = sessionStorage.getItem('invoice_role');

      const fullInvoice = await fetchInvoiceById(
        invoice.id,
        user.id,
        user.email,
        invoiceRole === 'user' ? 'user' : undefined
      );

      loadInvoice(fullInvoice);

      toast.success('Invoice ready to edit!', { id: 'edit-invoice' });

      if (onSwitchToPreview) {
        onSwitchToPreview();
      }
    } catch (err) {
      console.error('Error loading invoice for edit:', err);
      toast.error('Failed to load invoice for edit.', { id: 'edit-invoice' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadPDF = async (invoice: InvoiceListItem) => {
    if (!user) return;

    setProcessingId(invoice.id);

    try {
      toast.loading('Preparing PDF...', { id: 'download-pdf' });

      const invoiceRole = sessionStorage.getItem('invoice_role');

      const fullInvoice = await fetchInvoiceById(
        invoice.id,
        user.id,
        user.email,
        invoiceRole === 'user' ? 'user' : undefined
      );

      loadInvoice(fullInvoice);

      if (onSwitchToPreview) {
        onSwitchToPreview();
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));

await generateInvoicePDF({
  invoiceId: invoice.id,
  invoiceNumber: invoice.number,
  clientName: invoice.bill_to_name || 'user',
  currency: invoice.currency,
});

      toast.success('PDF downloaded!', { id: 'download-pdf' });
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF. Please try again.', { id: 'download-pdf' });
    } finally {
      setProcessingId(null);
    }
  };

  const formatWhatsAppPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');

  if (!digits) return '';

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
};

const handleShareWhatsApp = async (invoice: InvoiceListItem) => {
  if (!user) return;

  setProcessingId(invoice.id);

  try {
    toast.loading('Preparing WhatsApp share...', { id: 'share-whatsapp' });

    const invoiceRole = sessionStorage.getItem('invoice_role');

    const fullInvoice = await fetchInvoiceById(
      invoice.id,
      user.id,
      user.email,
      invoiceRole === 'user' ? 'user' : undefined
    );

    loadInvoice(fullInvoice);

    if (onSwitchToPreview) {
      onSwitchToPreview();
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));

    await generateInvoicePDF({
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      clientName: invoice.bill_to_name || 'user',
      currency: invoice.currency,
    });

    const phone = formatWhatsAppPhone(fullInvoice.bill_to_phone || '');

    const message = `Hello ${fullInvoice.bill_to_name || 'Customer'}, your invoice ${fullInvoice.number} has been generated. Amount due: ${formatCurrency(
      Number(fullInvoice.total_due || 0),
      fullInvoice.currency as any
    )}. The PDF has been downloaded. Please check the attached invoice PDF.`;

    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');

    toast.success('WhatsApp opened. Attach the downloaded PDF manually.', {
      id: 'share-whatsapp',
    });
  } catch (err) {
    console.error('Error sharing invoice on WhatsApp:', err);
    toast.error('Failed to share on WhatsApp.', { id: 'share-whatsapp' });
  } finally {
    setProcessingId(null);
  }
};

  const handleDeleteInvoice = async (invoice: InvoiceListItem) => {
    if (!window.confirm(`Delete invoice ${invoice.number}?`)) return;

    try {
      setProcessingId(invoice.id);
      toast.loading('Deleting invoice...', { id: 'delete-invoice' });

      await deleteInvoiceById(invoice.id);

      setInvoices((prev) => prev.filter((item) => item.id !== invoice.id));
      toast.success('Invoice deleted!', { id: 'delete-invoice' });
    } catch (err) {
      console.error('Error deleting invoice:', err);
      toast.error('Failed to delete invoice.', { id: 'delete-invoice' });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={loadInvoices}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No invoices found</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Create your first invoice to see it here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto bg-gray-50 dark:bg-gray-900 min-h-[600px]">
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        Search Invoice Number
      </label>
      <input
        type="text"
        value={searchInvoiceNumber}
        onChange={(e) => setSearchInvoiceNumber(e.target.value)}
        placeholder="e.g. INV-001"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      />
    </div>

    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        Search Client Name
      </label>
      <input
        type="text"
        value={searchClientName}
        onChange={(e) => setSearchClientName(e.target.value)}
        placeholder="e.g. Rahul"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      />
    </div>

    <div>
  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
    Search by Date
  </label>
  {React.createElement('input', {
    type: 'date',
    value: searchDate,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setSearchDate(e.target.value),
    className:
      'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none',
  })}
</div>

    <div className="flex items-end">
      <button
        onClick={clearFilters}
        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
      >
        Clear Filters
      </button>
    </div>
  </div>

  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
    Showing {filteredInvoices.length} of {invoices.length} invoices
  </div>
</div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Issue Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount Due
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
               
               {filteredInvoices.length === 0 && (
  <tr>
    <td
      colSpan={7}
      className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
    >
      No invoices match your search filters.
    </td>
  </tr>
)}
               
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="group hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {invoice.number}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {invoice.bill_to_name}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(invoice.issue_date)}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(invoice.due_date)}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {invoice.currency}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(Number(invoice.total_due || 0), invoice.currency as any)}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleOpenInvoice(invoice)}
                          disabled={processingId === invoice.id}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Eye className="h-3 w-3" />
                          <span>{processingId === invoice.id ? 'Loading...' : 'Open'}</span>
                        </button>

                        <button
                          onClick={() => handleDownloadPDF(invoice)}
                          disabled={processingId === invoice.id}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Download className="h-3 w-3" />
                          <span>PDF</span>
                        </button>

                        <button
                           onClick={() => handleShareWhatsApp(invoice)}
                           disabled={processingId === invoice.id}
                 className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                         < MessageCircle className="h-3 w-3" />
                          <span>WhatsApp</span>
                          </button>

                        <button
                          onClick={() => handleEditInvoice(invoice)}
                          disabled={processingId === invoice.id}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-yellow-600 text-white text-xs font-medium rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteInvoice(invoice)}
                          disabled={processingId === invoice.id}
                          className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center px-2.5 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete invoice"
                          aria-label="Delete invoice"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceRecords;