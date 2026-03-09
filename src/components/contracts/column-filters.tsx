"use client";

interface ColumnFilter {
  key: string;
  placeholder: string;
  type: 'text' | 'select';
  options?: { value: string; label: string }[];
}

interface ColumnFiltersProps {
  filters: ColumnFilter[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function ColumnFilters({ filters, values, onChange }: ColumnFiltersProps) {
  return (
    <div className="filter-row">
      {filters.map(filter => (
        filter.type === 'select' ? (
          <select
            key={filter.key}
            value={values[filter.key] || ''}
            onChange={e => onChange(filter.key, e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">{filter.placeholder}</option>
            {filter.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <input
            key={filter.key}
            type="text"
            placeholder={filter.placeholder}
            value={values[filter.key] || ''}
            onChange={e => onChange(filter.key, e.target.value)}
            style={{ flex: 1 }}
          />
        )
      ))}
    </div>
  );
}
