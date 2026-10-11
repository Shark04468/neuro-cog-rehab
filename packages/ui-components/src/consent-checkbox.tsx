export interface ConsentCheckboxProps {
  checked: boolean;
  title: string;
  description: string;
  helperText?: string;
  onChange: (checked: boolean) => void;
}

export function ConsentCheckbox({
  checked,
  title,
  description,
  helperText,
  onChange
}: ConsentCheckboxProps): JSX.Element {
  return (
    <label className="ncr-consent-card">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        <strong>{title}</strong>
        <span>{description}</span>
        {helperText ? <em>{helperText}</em> : null}
      </span>
    </label>
  );
}
