import { useEffect } from 'react';

export default function Dialog({ isOpen, title, children, onClose, onSubmit, submitLabel = 'Save', cancelLabel = 'Cancel' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative glass rounded-xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>

        <div className="mb-6">
          {children}
        </div>

        <div className="flex space-x-4 pt-4 border-t border-cyan-500/20">
          <button
            onClick={onSubmit}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-smooth font-medium"
          >
            {submitLabel}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 glass-sm text-cyan-300 hover:text-cyan-100 rounded-lg transition-smooth font-medium"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
