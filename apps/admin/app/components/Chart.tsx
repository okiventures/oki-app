interface ChartProps {
  title: string;
  data: number[];
  labels: string[];
  height?: number;
}

export function Chart({ title, data, labels, height = 200 }: ChartProps) {
  const max = Math.max(...data, 1);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <p className="mb-3 text-sm font-semibold text-gray-900">{title}</p>
      <div className="flex items-end justify-between pt-2" style={{ height }}>
        {data.map((val, index) => {
          const percentage = (val / max) * 100;
          return (
            <div key={index} className="flex flex-1 flex-col items-center">
              <div
                className="bg-primary-500 min-h-[4px] w-3/5 rounded-t"
                style={{ height: `${percentage}%` }}
              />
              <p className="mt-2 text-[10px] text-gray-400">{labels[index]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
