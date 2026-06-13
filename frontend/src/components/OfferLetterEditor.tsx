import React, { useState } from 'react';
import { Eye, Save, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { OfferLetterData } from '../pages/OfferLetterCreator';
import { createOfferLetter } from '../services/offerLetters';
import { OfferLetterPreviewRef } from './offerLetters/OfferLetterPreview';

interface OfferLetterEditorProps {
  offerData: OfferLetterData;
  updateOfferData: (field: keyof OfferLetterData, value: string) => void;
  onPreview: () => void;
  offerLetterPreviewRef: React.RefObject<OfferLetterPreviewRef>;
  onSaved?: () => void;
}

const OfferLetterEditor: React.FC<OfferLetterEditorProps> = ({
  offerData,
  updateOfferData,
  onPreview,
  offerLetterPreviewRef,
  onSaved,
}) => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const isDownloading = offerLetterPreviewRef.current?.isDownloading || false;

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in to save offer letters.');
      return;
    }

    if (!offerData.candidateName || !offerData.candidateEmail || !offerData.positionTitle) {
      toast.error('Please fill in candidate name, email, and position title.');
      return;
    }

    setIsSaving(true);

    try {
      toast.loading('Saving offer letter...', { id: 'save-offer' });

      await createOfferLetter({
        candidate_name: offerData.candidateName,
        candidate_email: offerData.candidateEmail,
        position_title: offerData.positionTitle,
        department: offerData.department || '-',
        issue_date: offerData.issueDate,
        acceptance_deadline: offerData.acceptanceDeadline || offerData.issueDate,
        status: 'Draft',
      });

      toast.success('Offer letter saved successfully!', { id: 'save-offer' });

      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      console.error('Error saving offer letter:', error);
      toast.error('Failed to save offer letter. Please try again.', { id: 'save-offer' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Offer Letter Details
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Fill the details and save the offer letter record.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 space-y-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Candidate Information
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Candidate Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={offerData.candidateName}
                onChange={(e) => updateOfferData('candidateName', e.target.value)}
                placeholder="Enter candidate full name"
                aria-label="Candidate name"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Candidate Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={offerData.candidateEmail}
                onChange={(e) => updateOfferData('candidateEmail', e.target.value)}
                placeholder="candidate@example.com"
                aria-label="Candidate email"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 space-y-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Position Details
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Position Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={offerData.positionTitle}
                onChange={(e) => updateOfferData('positionTitle', e.target.value)}
                placeholder="e.g., Web Developer Intern"
                aria-label="Position title"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <input
                type="text"
                value={offerData.department}
                onChange={(e) => updateOfferData('department', e.target.value)}
                placeholder="e.g., Engineering"
                aria-label="Department"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 space-y-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Dates
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={offerData.issueDate}
                onChange={(e) => updateOfferData('issueDate', e.target.value)}
                aria-label="Issue date"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Acceptance Deadline
              </label>
              <input
                type="date"
                value={offerData.acceptanceDeadline}
                onChange={(e) => updateOfferData('acceptanceDeadline', e.target.value)}
                aria-label="Acceptance deadline"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              onClick={onPreview}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Eye className="h-5 w-5" />
              <span>Preview</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5" />
              <span>{isSaving ? 'Saving...' : 'Save Offer Letter'}</span>
            </button>
          </div>

          <button
            onClick={() => offerLetterPreviewRef.current?.handleDownloadPDF?.()}
            disabled={isDownloading}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg transition-all shadow-lg disabled:cursor-not-allowed font-medium"
          >
            <Download className="h-5 w-5" />
            <span>{isDownloading ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfferLetterEditor;