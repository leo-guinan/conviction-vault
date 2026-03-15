"use client";

interface YieldEntry {
  epoch: number;
  distributed_at: string;
  total_yield: number;
  yield_per_share: number;
}

export default function YieldHistoryTable({ history }: { history: YieldEntry[] }) {
  if (!history || history.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-4">No yield distributions yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-800">
            <th className="text-left py-3 px-2 font-medium">Epoch</th>
            <th className="text-left py-3 px-2 font-medium">Date</th>
            <th className="text-right py-3 px-2 font-medium">Total Yield</th>
            <th className="text-right py-3 px-2 font-medium">Yield/Share</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry, i) => (
            <tr
              key={i}
              className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
            >
              <td className="py-3 px-2 font-mono text-indigo-400">
                #{entry.epoch}
              </td>
              <td className="py-3 px-2 text-gray-300">
                {new Date(entry.distributed_at).toLocaleDateString()}
              </td>
              <td className="py-3 px-2 text-right font-mono text-green-400">
                {Number(entry.total_yield).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
              </td>
              <td className="py-3 px-2 text-right font-mono text-gray-300">
                {Number(entry.yield_per_share).toFixed(6)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
