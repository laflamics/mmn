export default function PlafondStatus({ status }) {
  if (!status) return null;

  const getStatusColor = () => {
    if (status.isBlocked) return 'bg-red-500/30 text-red-200';
    if (status.isWarning) return 'bg-yellow-500/30 text-yellow-200';
    return 'bg-green-500/30 text-green-200';
  };

  const getProgressColor = () => {
    if (status.isBlocked) return 'bg-red-500';
    if (status.isWarning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-3">
      <div className={`p-3 rounded-lg ${getStatusColor()}`}>
        <p className="text-sm font-semibold">
          {status.isBlocked ? '🚫 Plafond Limit Reached' : status.isWarning ? '⚠️ Warning: High Usage' : '✓ Plafond Available'}
        </p>
        <p className="text-xs mt-1">
          ${status.used.toLocaleString()} / ${status.limit.toLocaleString()} ({status.usagePercent}%)
        </p>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Usage</span>
          <span>${status.remaining.toLocaleString()} remaining</span>
        </div>
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all`}
            style={{ width: `${Math.min(status.usagePercent, 100)}%` }}
          />
        </div>
      </div>

      {status.warningMessage && (
        <p className="text-xs text-slate-300 italic">{status.warningMessage}</p>
      )}
    </div>
  );
}
