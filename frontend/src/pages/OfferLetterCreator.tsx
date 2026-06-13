import React, { useState, useRef } from 'react';
import { FileText, List, Plus } from 'lucide-react';
import dayjs from 'dayjs';
import OfferLetterEditor from '../components/OfferLetterEditor';
import OfferLetterPreview, {
  OfferLetterPreviewRef,
} from '../components/offerLetters/OfferLetterPreview';
import OfferLetterRecords from '../components/offerLetters/OfferLetterRecords';
import type { OfferLetter } from '../services/offerLetters';

export interface OfferLetterData {
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  department: string;
  issueDate: string;
  acceptanceDeadline: string;
}

const getEmptyOfferData = (): OfferLetterData => ({
  candidateName: '',
  candidateEmail: '',
  positionTitle: '',
  department: '',
  issueDate: new Date().toISOString().split('T')[0],
  acceptanceDeadline: '',
});

const formatDateForInput = (date?: string) => {
  if (!date) return '';
  return dayjs(date).format('YYYY-MM-DD');
};

const OfferLetterCreator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'preview' | 'records'>('preview');
  const [offerData, setOfferData] = useState<OfferLetterData>(getEmptyOfferData());
  const [showPreview, setShowPreview] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const offerLetterPreviewRef = useRef<OfferLetterPreviewRef>(null);

  const fillOfferData = (offer: OfferLetter) => {
    setOfferData({
      candidateName: offer.candidate_name,
      candidateEmail: offer.candidate_email,
      positionTitle: offer.position_title,
      department: offer.department,
      issueDate: formatDateForInput(offer.issue_date),
      acceptanceDeadline: formatDateForInput(offer.acceptance_deadline),
    });
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleNewOffer = () => {
    setOfferData(getEmptyOfferData());
    setShowPreview(false);
    setActiveTab('preview');
  };

  const handleSaved = () => {
    setRefreshTrigger((prev) => prev + 1);
    setActiveTab('records');
  };

  const handleView = (offer: OfferLetter) => {
    fillOfferData(offer);
    setShowPreview(true);
    setActiveTab('preview');
  };

  const handleEdit = (offer: OfferLetter) => {
    fillOfferData(offer);
    setShowPreview(true);
    setActiveTab('preview');
  };

  const handleDownloadFromRecord = (offer: OfferLetter) => {
    fillOfferData(offer);
    setShowPreview(true);
    setActiveTab('preview');

    setTimeout(() => {
      offerLetterPreviewRef.current?.handleDownloadPDF?.();
    }, 500);
  };

  const updateOfferData = (field: keyof OfferLetterData, value: string) => {
    setOfferData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 py-6">
      <div className="mx-auto max-w-[1600px] rounded-xl border border-gray-700 bg-gray-800/70 shadow-2xl overflow-hidden">
        <div className="border-b border-gray-700 px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Offer Letter Creator</h1>
            <p className="text-sm text-gray-400 mt-1">
              Create, preview, download and manage offer letters.
            </p>
          </div>

          <button
            onClick={handleNewOffer}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
          >
            <Plus className="h-4 w-4" />
            <span>New Offer</span>
          </button>
        </div>

        <div className="grid grid-cols-12 min-h-[760px]">
          <div className="col-span-12 xl:col-span-4 border-b xl:border-b-0 xl:border-r border-gray-700 bg-gray-900/40">
            <OfferLetterEditor
              offerData={offerData}
              updateOfferData={updateOfferData}
              onPreview={handlePreview}
              offerLetterPreviewRef={offerLetterPreviewRef}
              onSaved={handleSaved}
            />
          </div>

          <div className="col-span-12 xl:col-span-8 flex flex-col bg-gray-900">
            <div className="flex-shrink-0 border-b border-gray-700 bg-gray-800 px-4 py-3">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Preview</span>
                </button>

                <button
                  onClick={() => setActiveTab('records')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'records'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <List className="h-4 w-4" />
                  <span>Offer Records</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === 'preview' ? (
                <OfferLetterPreview
                  ref={offerLetterPreviewRef}
                  offerData={offerData}
                  showPreview={showPreview}
                />
              ) : (
                <OfferLetterRecords
                  onView={handleView}
                  onEdit={handleEdit}
                  onDownload={handleDownloadFromRecord}
                  refreshTrigger={refreshTrigger}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferLetterCreator;