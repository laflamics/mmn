import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function Dialog({ isOpen, title, children, onClose, onSubmit, submitLabel = 'Save', cancelLabel = 'Cancel', isSubmitting = false }) {
  const { currentTheme } = useTheme();

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

  const getTitleColor = () => currentTheme.id === 'light' ? 'text-gray-900' : 'text-white';
  const getBorderColor = () => currentTheme.id === 'light' ? 'border-gray-300' : 'border-cyan-500/20';
  const getCancelButtonColor = () => currentTheme.id === 'light' ? 'text-gray-700 hover:text-gray-900' : 'text-cyan-300 hover:text-cyan-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative glass rounded-lg md:rounded-xl p-2 sm:p-3 md:p-4 lg:p-6 max-w-full sm:max-w-2xl w-full mx-1 sm:mx-2 md:mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className={`text-sm sm:text-base md:text-lg lg:text-xl font-bold ${getTitleColor()} mb-2 sm:mb-3 md:mb-4`}>{title}</h2>

        <div className="mb-2 sm:mb-3 md:mb-4">
          {children}
        </div>

        <div className={`flex flex-col md:flex-row gap-1.5 sm:gap-2 md:gap-3 pt-2 sm:pt-3 md:pt-3 border-t ${getBorderColor()}`}>
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className={`flex-1 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2 rounded-lg transition-smooth font-medium text-xs sm:text-sm md:text-base ${
              isSubmitting
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
            }`}
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`flex-1 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2 rounded-lg transition-smooth font-medium text-xs sm:text-sm md:text-base ${
              isSubmitting
                ? 'glass-sm text-gray-400 cursor-not-allowed opacity-50'
                : `glass-sm ${getCancelButtonColor()}`
            }`}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
