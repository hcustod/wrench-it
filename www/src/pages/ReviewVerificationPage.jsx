import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  LuStar,
  LuFileText,
  LuBadgeCheck,
  LuCircleAlert,
  LuCircleX,
} from 'react-icons/lu';

const mockPendingReviews = [
  {
    id: '1',
    shopName: 'Premium Auto Care',
    customerName: 'Jessica Martinez',
    rating: 5,
    service: 'Oil Change',
    reviewText:
      'Fast and professional service. In and out in 30 minutes. The staff was friendly and explained everything clearly. Price was exactly as quoted. Great experience!',
    date: 'November 20, 2025',
    hasReceipt: true,
    receiptDetails: {
      amount: '$45.00',
      date: 'November 20, 2025',
      service: 'Conventional Oil Change',
      fileName: 'receipt-2025-11-20.pdf',
    },
  },
];

function getPendingReviewById(id) {
  return mockPendingReviews.find((r) => r.id === id) ?? mockPendingReviews[0];
}

export default function ReviewVerificationPage() {
  const { id } = useParams();
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');

  const review = getPendingReviewById(id || '1');

  function handleApprove() {
    setStatus('Review approved (mock).');
  }

  function handleRequestInfo() {
    if (!note.trim()) {
      setStatus('Please add a note before requesting more info.');
      return;
    }
    setStatus('Requested more information from customer (mock).');
  }

  function handleReject() {
    if (!note.trim()) {
      setStatus('Please add a note before rejecting.');
      return;
    }
    setStatus('Review rejected (mock).');
  }

  return (
    <>
      <section className="mb-4">
        <h1 className="mb-1">Review Verification</h1>
        <p className="wt-text-muted mb-0">
          Verify the authenticity of this customer review.
        </p>
      </section>

      {status && (
        <div
          className="mb-3 small d-flex align-items-center gap-2"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 12,
            backgroundColor: 'rgba(108,99,255,0.1)',
            border: '1px solid rgba(108,99,255,0.4)',
          }}
        >
          <LuCircleAlert size={18} style={{ flexShrink: 0 }} />
          {status}
        </div>
      )}

      <section>
        <div className="row g-4">
          {/* Review details */}
          <div className="col-12 col-lg-6">
            <div className="wt-card">
              <div className="d-flex align-items-center gap-2 mb-3">
                <LuFileText size={18} style={{ color: '#FF8C42' }} />
                <h2 className="h6 text-white mb-0">Customer Review</h2>
              </div>

              <div className="d-flex flex-column gap-2 small wt-text-muted">
                <div>
                  <div className="text-white">Shop</div>
                  <div>{review.shopName}</div>
                </div>
                <div>
                  <div className="text-white">Customer</div>
                  <div>{review.customerName}</div>
                </div>
                <div>
                  <div className="text-white">Service</div>
                  <div>{review.service}</div>
                </div>
                <div>
                  <div className="text-white">Date</div>
                  <div>{review.date}</div>
                </div>
                <div>
                  <div className="text-white mb-1">Rating</div>
                  <div className="d-flex align-items-center gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <LuStar
                        key={idx}
                        size={18}
                        style={
                          idx < (review.rating ?? 0)
                            ? { color: '#FF8C42', fill: '#FF8C42' }
                            : { color: '#3A3652' }
                        }
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-white mb-1">Review Text</div>
                  <div
                    className="rounded-4 p-3"
                    style={{ backgroundColor: '#2A2740', border: '1px solid #3A3652' }}
                  >
                    <p className="mb-0 text-white">{review.reviewText}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt + actions */}
          <div className="col-12 col-lg-6 d-flex flex-column gap-4">
            <div className="wt-card">
              <div className="d-flex align-items-center gap-2 mb-3">
                <LuFileText size={18} style={{ color: '#FF8C42' }} />
                <h2 className="h6 text-white mb-0">Receipt Preview</h2>
              </div>

              {review.hasReceipt ? (
                <div className="d-flex flex-column gap-3 small">
                  <div
                    className="rounded-4 d-flex align-items-center justify-content-center"
                    style={{
                      backgroundColor: '#2A2740',
                      border: '2px dashed #3A3652',
                      height: '14rem',
                    }}
                  >
                    <div className="text-center wt-text-muted">
                      <LuFileText size={40} className="mb-2" />
                      <div>{review.receiptDetails.fileName ?? 'Receipt file'}</div>
                      <div className="small">Preview not implemented in mock.</div>
                    </div>
                  </div>

                  <div
                    className="rounded-4 p-3"
                    style={{
                      backgroundColor: 'rgba(255,140,66,0.1)',
                      border: '1px solid rgba(255,140,66,0.3)',
                    }}
                  >
                    <div className="text-white mb-2">Receipt Details</div>
                    <div className="d-flex flex-column gap-1 wt-text-muted">
                      <div className="d-flex justify-content-between">
                        <span>Service</span>
                        <span>{review.receiptDetails.service}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Amount</span>
                        <span>{review.receiptDetails.amount}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Date</span>
                        <span>{review.receiptDetails.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-4 p-4 text-center"
                  style={{ backgroundColor: '#2A2740', border: '1px solid #3A3652' }}
                >
                  <LuFileText size={32} className="wt-text-muted mb-2" />
                  <p className="wt-text-muted mb-1">No receipt uploaded.</p>
                  <p className="wt-text-muted small mb-0">
                    Verify based on service details and overall context.
                  </p>
                </div>
              )}
            </div>

            <div className="wt-card">
              <h3 className="h6 text-white mb-3">Verification Decision</h3>

              <div className="mb-3">
                <label className="form-label text-white small mb-1">
                  Optional Note (shown to customer if rejected or more info is requested)
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  style={{
                    backgroundColor: '#2A2740',
                    border: '1px solid #3A3652',
                    borderRadius: 12,
                    color: '#ffffff',
                    resize: 'none',
                    fontSize: '0.95rem',
                  }}
                  placeholder="Add notes explaining your decision..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="d-flex flex-column gap-2">
                <button
                  type="button"
                  className="btn d-flex justify-content-center align-items-center gap-2"
                  style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
                  onClick={handleApprove}
                >
                  <LuBadgeCheck size={18} />
                  <span>Approve & Verify</span>
                </button>
                <button
                  type="button"
                  className="btn d-flex justify-content-center align-items-center gap-2"
                  style={{ backgroundColor: '#FF8C42', color: '#ffffff' }}
                  onClick={handleRequestInfo}
                >
                  <LuFileText size={18} />
                  <span>Request More Info</span>
                </button>
                <button
                  type="button"
                  className="btn d-flex justify-content-center align-items-center gap-2"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #d32f2f',
                    color: '#ef4444',
                  }}
                  onClick={handleReject}
                >
                  <LuCircleX size={18} />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

