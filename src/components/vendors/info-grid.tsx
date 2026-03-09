interface InfoGridProps {
  items: { label: string; value: string | number | boolean | null | undefined }[];
  columns?: 1 | 2;
}

export function InfoGrid({ items, columns = 2 }: InfoGridProps) {
  return (
    <div className="info-grid" style={columns === 1 ? { gridTemplateColumns: '1fr' } : undefined}>
      {items.map((item, i) => (
        <div key={i} className="info-row">
          <span className="info-key">{item.label}</span>
          <span className="info-val">
            {item.value === null || item.value === undefined || item.value === ''
              ? '—'
              : typeof item.value === 'boolean'
              ? item.value ? 'Yes' : 'No'
              : String(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
