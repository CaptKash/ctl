type Callback = (value: string) => void;

let _callback: Callback | null = null;
let _options: string[] = [];
let _label: string = "";
let _value: string = "";

export function registerPicker(label: string, options: string[], value: string, cb: Callback) {
  _label = label;
  _options = options;
  _value = value;
  _callback = cb;
}

export function getPickerState() {
  return { label: _label, options: _options, value: _value };
}

export function resolvePickerSelection(value: string) {
  if (_callback) {
    _callback(value);
    _callback = null;
  }
}

export function clearPicker() {
  _callback = null;
}
