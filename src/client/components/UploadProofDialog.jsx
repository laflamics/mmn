import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Dialog from './Dialog';

export default function UploadProofDialog({ isOpen, onClose, onSuccess, payment }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [proofType, setProofType] = useState('receipt'); // receipt, invoice, bank_statement, other

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Only JPG, PNG, WebP, and PDF files are allowed');
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError('');
  };

  const handleUpload = async () => {
    if (!file || !payment) {
      setError('Please select a file');
      return;
    }

    try {
      setUploading(true);
      setError('');

      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `payment-${payment.id}-${proofType}-${timestamp}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      // Update payment record with proof URL
      const { error: updateErr } = await supabase
        .from('payments')
        .update({
          proof_document_url: publicUrl,
          proof_document_type: proofType,
          proof_uploaded_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (updateErr) throw updateErr;

      setFile(null);
      setProofType('receipt');
      onSuccess?.();
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setProofType('receipt');
    setError('');
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      title="Upload Transaction Proof"
      onClose={handleClose}
      onSubmit={handleUpload}
      submitLabel="Upload"
      isLoading={uploading}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {payment && (
          <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
            <p className="text-xs text-slate-400">Payment Reference</p>
            <p className="text-white font-semibold">{payment.reference_number}</p>
            <p className="text-xs text-slate-400 mt-1">Amount: Rp {payment.amount?.toLocaleString('id-ID')}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Proof Type
          </label>
          <select 
            value={proofType}
            onChange={(e) => setProofType(e.target.value)}
            disabled={uploading}
            className="w-full px-4 py-2 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          >
            <option className="bg-slate-800" value="receipt">Receipt</option>
            <option className="bg-slate-800" value="invoice">Invoice</option>
            <option className="bg-slate-800" value="bank_statement">Bank Statement</option>
            <option className="bg-slate-800" value="other">Other Document</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Select File
          </label>
          <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-slate-500 transition-smooth">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
              id="proof-file-input"
            />
            <label htmlFor="proof-file-input" className="cursor-pointer block">
              {file ? (
                <div>
                  <p className="text-green-400 font-semibold text-sm">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-300 font-medium">Click to select file</p>
                  <p className="text-xs text-slate-400 mt-1">
                    JPG, PNG, WebP, or PDF (max 10MB)
                  </p>
                </div>
              )}
            </label>
          </div>
        </div>

        {uploading && (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            <span className="text-sm text-slate-300">Uploading...</span>
          </div>
        )}
      </div>
    </Dialog>
  );
}
