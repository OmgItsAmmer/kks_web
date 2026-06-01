import React, { useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { checkoutService } from '../../services/checkout.service';
import styles from './PaymentReceiptUpload.module.css';

interface PaymentReceiptUploadProps {
  isMandatory: boolean;
  receiptPath: string | null;
  receiptPreviewUrl: string | null;
  onReceiptChange: (data: { receiptPath: string | null; receiptPreviewUrl: string | null }) => void;
  onUploadError: (message: string) => void;
}

const PaymentReceiptUpload: React.FC<PaymentReceiptUploadProps> = ({
  isMandatory,
  receiptPath,
  receiptPreviewUrl,
  onReceiptChange,
  onUploadError,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onUploadError('Please upload an image file (JPEG, PNG, WebP, or GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onUploadError('Receipt image must be 5MB or smaller.');
      return;
    }

    try {
      setUploading(true);
      const result = await checkoutService.uploadPaymentReceipt(file);
      onReceiptChange({
        receiptPath: result.receiptPath,
        receiptPreviewUrl: result.receiptUrl,
      });
    } catch (error: any) {
      onUploadError(error.message || 'Failed to upload payment receipt.');
      onReceiptChange({ receiptPath: null, receiptPreviewUrl: null });
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onReceiptChange({ receiptPath: null, receiptPreviewUrl: null });
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Advance Payment Receipt</h3>
        {isMandatory && <span className={styles.requiredBadge}>Required</span>}
      </div>

      <p className={styles.notice}>
        An advance payment is required to confirm your order. Upload a clear photo of your
        payment receipt or transfer screenshot. If your order is not delivered, your money
        will be refunded.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className={styles.hiddenInput}
        onChange={handleFileSelect}
        disabled={uploading}
      />

      {!receiptPreviewUrl ? (
        <button
          type="button"
          className={styles.uploadBtn}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={20} />
          {uploading ? 'Uploading receipt...' : 'Upload Payment Receipt'}
        </button>
      ) : (
        <div className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <CheckCircle2 size={18} className={styles.successIcon} />
            <span>Receipt uploaded successfully</span>
          </div>
          <div className={styles.previewImageWrap}>
            <img src={receiptPreviewUrl} alt="Payment receipt preview" className={styles.previewImage} />
          </div>
          <button type="button" className={styles.changeBtn} onClick={() => inputRef.current?.click()} disabled={uploading}>
            <ImageIcon size={16} />
            {uploading ? 'Uploading...' : 'Replace Receipt'}
          </button>
          <button type="button" className={styles.removeBtn} onClick={handleRemove} disabled={uploading}>
            Remove
          </button>
        </div>
      )}

      {isMandatory && !receiptPath && !uploading && (
        <p className={styles.helperText}>
          <AlertCircle size={14} />
          Upload your payment receipt before placing the order.
        </p>
      )}
    </div>
  );
};

export default PaymentReceiptUpload;
