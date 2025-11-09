'use client';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'CONFIRM',
  cancelText = 'CANCEL',
  onConfirm,
  onCancel,
  isDanger = false,
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 font-mono">
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white max-w-md w-full p-6">
        {/* Header */}
        <div className="mb-4 pb-4 border-b border-black dark:border-white">
          <h2 className="text-lg font-bold">{title}</h2>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-sm whitespace-pre-line">{message}</p>
        </div>

        {/* Actions or Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="animate-spin h-8 w-8 border-2 border-black dark:border-white border-t-transparent rounded-full"></div>
            <p className="text-xs font-bold">Deleting all data...</p>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-black dark:border-white text-xs font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 text-xs font-bold ${
                isDanger
                  ? 'bg-red-600 text-white border-2 border-red-600 hover:bg-red-700'
                  : 'bg-black text-white dark:bg-white dark:text-black'
              }`}
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
