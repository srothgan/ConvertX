import { Badge } from "~/components/ui/badge";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "~/components/ui/combobox";

export type FormatComboboxOption = {
  value: string;
  label: string;
  description: string;
  meta?: string | undefined;
  badges?: string[] | undefined;
  disabled?: boolean | undefined;
  disabledReason?: string | undefined;
};

type FormatComboboxProps = {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  options: FormatComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
};

const optionSearchValue = (option: FormatComboboxOption) =>
  [option.label, option.description, option.meta, option.disabledReason, ...(option.badges ?? [])]
    .filter(Boolean)
    .join(" ");

export function FormatCombobox({
  label,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  options,
  value,
  onValueChange,
  disabled,
}: FormatComboboxProps) {
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium text-stone-900">{label}</span>
      <Combobox<FormatComboboxOption>
        autoHighlight
        disabled={disabled}
        filter={(option, query) =>
          optionSearchValue(option).toLowerCase().includes(query.trim().toLowerCase())
        }
        isItemEqualToValue={(option, selectedOption) => option.value === selectedOption.value}
        itemToStringLabel={(option) => option.label}
        itemToStringValue={(option) => option.value}
        onValueChange={(option) => onValueChange(option?.value ?? "")}
        value={selected}
        items={options}
      >
        <ComboboxInput
          className="h-auto min-h-12 rounded-xl border-stone-300 bg-white shadow-sm"
          disabled={disabled}
          placeholder={selected ? selected.label : disabled ? placeholder : searchPlaceholder}
        />
        <span className="block truncate text-xs text-muted-foreground">
          {selected?.meta ?? selected?.description ?? "Search by extension, converter, or format"}
        </span>
        <ComboboxContent className="w-[min(42rem,calc(100vw-2rem))]">
          <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
          <ComboboxList className="max-h-[24rem]">
            {(option: FormatComboboxOption) => (
              <ComboboxItem disabled={option.disabled} key={option.value} value={option}>
                <div className="grid min-w-0 flex-1 gap-1 py-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">{option.label}</span>
                    {option.badges?.slice(0, 3).map((badge) => (
                      <Badge className="shrink-0" key={badge} variant="secondary">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {option.disabled && option.disabledReason
                      ? option.disabledReason
                      : option.description}
                  </p>
                </div>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
