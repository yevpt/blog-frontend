"use client";

import {
  Autocomplete as AriaAutocomplete,
  useFilter,
  type AutocompleteProps as AriaAutocompleteProps,
} from "react-aria-components/Autocomplete";
import { Dropdown } from "../dropdown";
import { SearchField } from "../search-field";

export interface AutocompleteRootProps<T extends object = object> extends Omit<
  AriaAutocompleteProps<T>,
  "filter"
> {
  filter?: AriaAutocompleteProps<T>["filter"];
  filterSensitivity?: Intl.CollatorOptions["sensitivity"];
}

function AutocompleteRoot<T extends object = object>({
  filter,
  filterSensitivity = "base",
  children,
  ...props
}: AutocompleteRootProps<T>) {
  const { contains } = useFilter({ sensitivity: filterSensitivity });

  return (
    <AriaAutocomplete filter={filter ?? contains} {...props}>
      {children}
    </AriaAutocomplete>
  );
}

export const Autocomplete = AutocompleteRoot as typeof AutocompleteRoot & {
  Trigger: typeof Dropdown.Root;
  Popover: typeof Dropdown.Popover;
  SearchField: typeof SearchField;
  Menu: typeof Dropdown.Menu;
  Item: typeof Dropdown.Item;
};

Autocomplete.Trigger = Dropdown.Root;
Autocomplete.Popover = Dropdown.Popover;
Autocomplete.SearchField = SearchField;
Autocomplete.Menu = Dropdown.Menu;
Autocomplete.Item = Dropdown.Item;
