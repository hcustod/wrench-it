import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LuStar, LuUpload, LuInfo } from 'react-icons/lu';
import { createReceipt } from '../api/receipts.js';
import { submitReview } from '../api/reviews.js';
import { getStore, listStoreServices } from '../api/stores.js';

export default function WriteReviewPage() {
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId') || searchParams.get('shopId') || '';

  const [shop, setShop] = useState(null);
  const [services, setServices] = useState([]);
  const [loadingContext, setLoadingContext] = useState(false);
  const [contextError, setContextError] = useState('');

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [serviceId, setServiceId] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      if (!storeId) {
        setShop(null);
        setServices([]);
        setContextError('');
        return;
      }

      setLoadingContext(true);
      setContextError('');
      try {
        const [storeRes, servicesRes] = await Promise.all([
          getStore(storeId),
          listStoreServices(storeId),
        ]);
        if (cancelled) return;
        setShop(storeRes);
        setServices(servicesRes ?? []);
      } catch (err) {
        if (cancelled) return;
        setShop(null);
        setServices([]);
        setContextError(
          err instanceof Error ? err.message : 'Failed to load shop or service data.',
        );
      } finally {
        if (!cancelled) setLoadingContext(false);
      }
    }

    loadContext();

    return () => {
      cancelled = true;
    };
  }, [storeId]);

  function handleFileChange(e) {
    const file = e.target.files?.[0] ?? null;
    setReceiptFile(file);
    setFileName(file ? file.name : '');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!storeId) {
      setError('Select a shop before submitting a review.');
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
        const receipt = await createReceipt({
          file: receiptFile,
          storeId,
          currency: 'USD',
        });
        receiptId = receipt?.id;
      }

      await submitReview(storeId, {
        rating,
        comment: reviewText.trim(),
        serviceId: serviceId || undefined,
        receiptId,
      });

      setSuccess('Review submitted for verification.');
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

  const displayShopName = shop?.name ?? (storeId ? 'Loading shop...' : 'Select a shop from search');

  return (
    <>
      <section className="mb-4">
        <h1 className="mb-1">Write a Review</h1>
        <p className="wt-text-muted mb-0">Share your experience to help others.</p>
      </section>

      <section>
        <div className="wt-card" style={{ maxWidth: '720px', margin: '0 auto' }}>
          {loadingContext && (
            <div className="small mb-3 wt-text-muted">Loading shop data...</div>
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
              <label className="form-label text-white small mb-1">Service Performed *</label>
              <select
                className="form-select wt-input"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                disabled={!storeId || loadingContext}
              >
                <option value="">Select a service</option>
                {services.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name}
                  </option>
                ))}
              </select>
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
                placeholder="Tell us about your experience..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
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
                      <span className="wt-text-muted small">Click to change file</span>
                    </>
                  ) : (
                    <>
                      <span className="wt-text-muted">
                        Click to upload receipt (PDF or image, max 10MB)
                      </span>
                    </>
                  )}
                </label>
              </div>

              <div
                className="d-flex gap-2 align-items-start mt-3 rounded-4 p-3 small"
                style={{
                  backgroundColor: 'rgba(255,140,66,0.1)',
                  border: '1px solid rgba(255,140,66,0.3)',
                }}
              >
                <LuInfo size={18} style={{ color: '#FF8C42', marginTop: 2 }} />
                <p className="wt-text-muted mb-0">
                  Uploaded receipts will be reviewed by a certified mechanic to help verify
                  your review and maintain trust in the community.
                </p>
              </div>
            </div>

            <div className="d-flex flex-column flex-md-row gap-2 pt-2">
              <button
                type="submit"
                className="btn btn-wt-primary flex-grow-1"
                disabled={!rating || !reviewText.trim() || !storeId || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                type="button"
                className="btn btn-wt-outline"
                onClick={() => {
                  setRating(0);
                  setHoverRating(0);
                  setServiceId('');
                  setReviewText('');
                  setReceiptFile(null);
                  setFileName('');
                  setError('');
                  setSuccess('');
                }}
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
