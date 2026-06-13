import React from 'react';
import { OfferLetterData } from '../pages/OfferLetterCreator';
import dayjs from 'dayjs';

interface OfferLetterPreviewProps {
  offerData: OfferLetterData;
  showPreview: boolean;
}

const OfferLetterPreview: React.FC<OfferLetterPreviewProps> = ({ offerData, showPreview }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  if (!showPreview) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg">Click "Preview" to see the offer letter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-100 dark:bg-gray-900">
      <div className="p-8">
        <div
          className="max-w-4xl mx-auto bg-white shadow-2xl a4-page"
        >
          <div className="relative">
            <div className="px-12 pt-8">
              <img
                src="/Logo_withoutBG.png"
                alt="Shivohini TechAI"
                className="h-20 w-auto"
              />
            </div>

            <div className="px-12 py-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">OFFER LETTER</h1>
                <div className="text-sm text-gray-600">
                  <p>Date: {formatDate(offerData.issueDate)}</p>
                </div>
              </div>

              <div className="space-y-6 text-gray-800">
                <div>
                  <p className="font-semibold">Dear {offerData.candidateName || '[Candidate Name]'},</p>
                </div>

                <p className="leading-relaxed">
                  We are pleased to offer you the position of <span className="font-semibold">{offerData.positionTitle || '[Position Title]'}</span>
                  {offerData.department && (
                    <> in the <span className="font-semibold">{offerData.department}</span> department</>
                  )} at Shivohini TechAI.
                </p>

                <p className="leading-relaxed">
                  We believe that your skills, experience, and enthusiasm make you an excellent fit for our team,
                  and we are excited about the contributions you will make to our organization.
                </p>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Position Details:</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex">
                      <span className="w-40 text-gray-600">Position:</span>
                      <span className="font-medium">{offerData.positionTitle || '[Position Title]'}</span>
                    </div>
                    {offerData.department && (
                      <div className="flex">
                        <span className="w-40 text-gray-600">Department:</span>
                        <span className="font-medium">{offerData.department}</span>
                      </div>
                    )}
                    <div className="flex">
                      <span className="w-40 text-gray-600">Issue Date:</span>
                      <span className="font-medium">{formatDate(offerData.issueDate)}</span>
                    </div>
                    {offerData.acceptanceDeadline && (
                      <div className="flex">
                        <span className="w-40 text-gray-600">Response Deadline:</span>
                        <span className="font-medium">{formatDate(offerData.acceptanceDeadline)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="leading-relaxed">
                  This offer is contingent upon successful completion of any background checks and verification of
                  credentials as required by our company policy.
                </p>

                {offerData.acceptanceDeadline && (
                  <p className="leading-relaxed">
                    Please confirm your acceptance of this offer by <span className="font-semibold">{formatDate(offerData.acceptanceDeadline)}</span>.
                  </p>
                )}

                <p className="leading-relaxed">
                  We look forward to welcoming you to the Shivohini TechAI team and are confident that you will find
                  your experience with us both rewarding and fulfilling.
                </p>

                <div className="mt-8">
                  <p className="mb-1">Sincerely,</p>
                  <div className="mt-12 mb-2">
                    <div className="border-t border-gray-400 w-48"></div>
                  </div>
                  <p className="font-semibold">Shivohini TechAI</p>
                  <p className="text-sm text-gray-600">Human Resources Department</p>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-300">
                  <h3 className="font-semibold text-gray-900 mb-3">Candidate Acceptance:</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    I, {offerData.candidateName || '[Candidate Name]'}, accept the position of {offerData.positionTitle || '[Position Title]'}
                    with Shivohini TechAI under the terms outlined in this offer letter.
                  </p>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="border-t border-gray-400 mb-1"></div>
                      <p className="text-sm text-gray-600">Signature</p>
                    </div>
                    <div>
                      <div className="border-t border-gray-400 mb-1"></div>
                      <p className="text-sm text-gray-600">Date</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <img
                src="/OfferLetter_bottomDesign.png"
                alt="Bottom Design"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferLetterPreview;
