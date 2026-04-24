import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LuStar, LuUpload, LuInfo } from 'react-icons/lu';
import { createReceipt } from '../api/receipts.js';
import { submitReview } from '../api/reviews.js';
import { getStore } from '../api/stores.js';
import { listReviewableWorkOrders } from '../api/workOrders.js';

function formatDateTime(value) {
  if (!value) return 'Unknown visit time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function WriteReviewPage() {
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId') || searchParams.get('shopId') || '';
  const preselectedWorkOrderId = searchParams.get('workOrderId') || '';

  const [shop, setShop] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState('');
  const [loadingContext, setLoadingContext] = useState(false);
  const [contextError, setContextError] = useState('');

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      setLoadingContext(true);
      setContextError('');
      try {
        const [storeRes, reviewableWorkOrders] = await Promise.all([
          storeId ? getStore(storeId) : Promise.resolve(null),
          listReviewableWorkOrders(storeId || undefined),
        ]);
        if (cancelled) return;

        setShop(storeRes);
        setWorkOrders(reviewableWorkOrders ?? []);

        // If the page was opened from a specific job, keep that visit selected when it is still reviewable.
        const nextSelected =
          (reviewableWorkOrders ?? []).find((item) => item.id === preselectedWorkOrderId)?.id
          || reviewableWorkOrders?.[0]?.id
          || '';
        setSelectedWorkOrderId(nextSelected);
      } catch (err) {
        if (cancelled) return;
        setShop(null);
        setWorkOrders([]);
        setSelectedWorkOrderId('');
        setContextError(
          err instanceof Error ? err.message : 'Failed to load completed work orders.',
        );
      } finally {
        if (!cancelled) setLoadingContext(false);
      }
    }

    loadContext();

    return () => {
      cancelled = true;
    };
  }, [storeId, preselectedWorkOrderId]);

  const selectedWorkOrder = useMemo(
    () => workOrders.find((item) => item.id === selectedWorkOrderId) ?? null,
    [workOrders, selectedWorkOrderId],
  );

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null;
    setReceiptFile(file);
    setFileName(file ? file.name : '');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedWorkOrder) {
      setError('Select a completed work order before submitting a review.');
      return;
    }
    if (!rating || !reviewText.trim()) {
      setError('Rating and review text are required.');
      return;
    }

    setSubmitting(true);

    try {
      let receiptId;

      if (receiptFile) {
        // Upload the receipt first so the review can point at the stored file in one submit flow.
        const receipt = await createReceipt({
          file: receiptFile,
          storeId: selectedWorkOrder.storeId,
          currency: 'USD',
        });
        receiptId = receipt?.id;
      }

      await submitReview(selectedWorkOrder.storeId, {
        rating,
        comment: reviewText.trim(),
        serviceId: selectedWorkOrder.serviceId,
        workOrderId: selectedWorkOrder.id,
        receiptId,
      });

      // Remove the visit locally after submit so users do not accidentally review the same work order twice.
      const remainingWorkOrders = workOrders.filter((item) => item.id !== selectedWorkOrder.id);
      setSuccess('Review submitted for verification.');
      setRating(0);
      setHoverRating(0);
      setReviewText('');
      setReceiptFile(null);
      setFileName('');
      setWorkOrders(remainingWorkOrders);
      setSelectedWorkOrderId(remainingWorkOrders[0]?.id ?? '');
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err && err.status === 401) {
        setError('You need to be logged in to submit a review.');
      } else {
        setError(
          err instanceof Error ? err.message : 'Failed to submit review. Please try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const displayShopName = selectedWorkOrder?.shopName
    ?? shop?.name
    ?? (storeId ? 'Loading shop...' : 'Select a completed visit');

  return (
    <>
      <section className="mb-4">
        <h1 className="mb-1">Write a Review</h1>
        <p className="wt-text-muted mb-0">
          Reviews are now tied to completed work orders so each visit can have its own feedback.
        </p>
      </section>

      <section>
        <div className="wt-card" style={{ maxWidth: '720px', margin: '0 auto' }}>
          {loadingContext && (
            <div className="small mb-3 wt-text-muted">Loading completed work orders...</div>
          )}
          {contextError && (
            <div className="small mb-3" style={{ color: '#FF8C42' }}>
              {contextError}
            </div>
          )}
          {error && (
            <div className="small mb-3" style={{ color: '#FF8C42' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="small mb-3 wt-text-muted">
              {success}
            </div>
          )}

          {!loadingContext && workOrders.length === 0 && (
            <div
              className="rounded-4 p-3 mb-3"
              style={{
                backgroundColor: '#2A2740',
                border: '1px solid #3A3652',
              }}
            >
              <div className="text-white mb-1">No completed work orders are ready for review.</div>
              <div className="wt-text-muted small">
                Complete a work order first, then come back here to leave visit-based feedback.
              </div>
              <div className="d-flex gap-2 mt-3">
                <Link to="/dashboard" className="btn btn-sm btn-wt-primary">
                  Open Dashboard
                </Link>
                {storeId && (
                  <Link
                    to={`/request-work-order?storeId=${storeId}`}
                    className="btn btn-sm btn-wt-outline"
                  >
                    Request Work Order
                  </Link>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
            <div>
              <label className="form-label text-white small mb-1">Shop Name</label>
              <input
                type="text"
                readOnly
                className="form-control wt-input"
                value={displayShopName}
              />
            </div>

            <div>
              <label className="form-label text-white small mb-1">Completed Visit *</label>
              <select
                className="form-select wt-input"
                value={selectedWorkOrderId}
                onChange={(event) => setSelectedWorkOrderId(event.target.value)}
                disabled={loadingContext || workOrders.length === 0}
              >
                <option value="">Select a completed visit</option>
                {workOrders.map((workOrder) => (
                  <option key={workOrder.id} value={workOrder.id}>
                    {workOrder.shopName} - {workOrder.service} - {formatDateTime(workOrder.completedAt || workOrder.scheduledFor)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label text-white small mb-1">Service</label>
              <input
                type="text"
                readOnly
                className="form-control wt-input"
                value={selectedWorkOrder?.service ?? 'Select a completed visit first'}
              />
            </div>

            {selectedWorkOrder?.vehicleLabel && (
              <div className="small wt-text-muted">
                Vehicle: {selectedWorkOrder.vehicleLabel}
              </div>
            )}

            <div>
              <label className="form-label text-white small mb-1">Your Rating *</label>
              <div className="d-flex align-items-center gap-2">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const value = idx + 1;
                  const active = value <= (hoverRating || rating);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHoverRating(value)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{ background: 'transparent', border: 'none', padding: 0 }}
                    >
                      <LuStar
                        size={28}
                        style={
                          active
                            ? { color: '#FF8C42', fill: '#FF8C42' }
                            : { color: '#3A3652' }
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="form-label text-white small mb-1">Your Review *</label>
              <textarea
                className="form-control"
                rows={5}
                style={{
                  backgroundColor: '#2A2740',
                  border: '1px solid #3A3652',
                  borderRadius: 12,
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  resize: 'none',
                }}
                placeholder="Tell us about this completed visit..."
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
              />
            </div>

            <div>
              <label className="form-label text-white small mb-1">
                Upload Receipt (Optional)
              </label>
              <div
                className="d-flex flex-column align-items-center justify-content-center text-center"
                style={{
                  border: '2px dashed #3A3652',
                  borderRadius: 12,
                  padding: '2rem',
                }}
              >
                <input
                  type="file"
                  id="receipt-upload"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="receipt-upload"
                  className="d-flex flex-column align-items-center"
                  style={{ cursor: 'pointer' }}
                >
                  <LuUpload size={32} className="wt-text-muted mb-2" />
                  {fileName ? (
                    <>
                      <span className="text-white">{fileName}</span>
                      <span className="small wt-text-muted mt-1">Click to replace file</span>
                    </>
                  ) : (
                    <>
                      <span className="text-white">Click to upload receipt</span>
                      <span className="small wt-text-muted mt-1">
                        JPG, PNG, or PDF accepted
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div
              className="rounded-4 p-3 d-flex gap-2 align-items-start"
              style={{
                backgroundColor: 'rgba(59,130,246,0.12)',
                border: '1px solid rgba(59,130,246,0.35)',
              }}
            >
              <LuInfo size={18} style={{ color: '#60a5fa', flexShrink: 0, marginTop: 2 }} />
              <div className="small wt-text-muted">
                Uploaded receipts will be reviewed by a certified mechanic to help verify that this completed visit really happened.
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-wt-primary mt-2"
              disabled={submitting || !selectedWorkOrder}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
