export type FormSelectOption = readonly [string, string];

type FormSelectProps = {
  value: string;
  onChange: (value: string) => void | Promise<void>;
  options: readonly FormSelectOption[];
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  /** Native aria-label when no visible Field label */
  "aria-label"?: string;
};

/** Native select styled as `db-input` — no search UI, for bounded option lists. */
export function FormSelect({ value, onChange, options, disabled, required, id, className = "", "aria-label": ariaLabel }: FormSelectProps) {
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      className={`db-input ${className}`.trim()}
      disabled={disabled}
      required={required}
      value={value}
      onChange={(e) => {
        void Promise.resolve(onChange(e.target.value));
      }}
    >
      {options.map(([optValue, label]) => (
        <option key={optValue === "" ? "__empty" : optValue} value={optValue}>
          {label}
        </option>
      ))}
    </select>
  );
}
