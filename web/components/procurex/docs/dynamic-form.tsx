"use client"

import { Plus, Trash2 } from "lucide-react"
import { Fragment, useCallback, useState } from "react"

import type { ManualFieldConfig } from "@/modules/ai-extraction"

// -----------------------------------------------------------------------------
// Form-value helpers: walk dot-paths inside nested objects
// -----------------------------------------------------------------------------

type Value = unknown

function getAt(obj: Record<string, Value>, path: string): Value {
  const parts = path.split(".")
  let cur: Value = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = (cur as Record<string, Value>)[p]
  }
  return cur
}

function setAt(
  obj: Record<string, Value>,
  path: string,
  value: Value,
): Record<string, Value> {
  const parts = path.split(".")
  const next = { ...obj }
  let cur: Record<string, Value> = next
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!
    const existing = cur[key]
    const child =
      typeof existing === "object" && existing !== null && !Array.isArray(existing)
        ? { ...(existing as Record<string, Value>) }
        : {}
    cur[key] = child
    cur = child as Record<string, Value>
  }
  cur[parts[parts.length - 1]!] = value
  return next
}

// -----------------------------------------------------------------------------
// Field renderers (one per ManualFieldConfig.kind)
// -----------------------------------------------------------------------------

interface FieldProps {
  field: ManualFieldConfig
  pathPrefix: string
  value: Record<string, Value>
  onChange: (next: Record<string, Value>) => void
  rowMode?: boolean
}

function Label({
  children,
  required,
  filled,
}: {
  children: React.ReactNode
  required?: boolean
  filled?: boolean
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-medium text-[#434343] mb-1">
      {filled ? (
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-emerald-500 shrink-0"
          title="Populated"
        />
      ) : null}
      <span>{children}</span>
      {required ? <span className="text-[#c32a4f] ml-0.5">*</span> : null}
    </label>
  )
}

function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false
  if (typeof v === "string") return v.trim().length > 0
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === "object") return Object.keys(v as object).length > 0
  return true
}

const inputBase =
  "w-full h-10 rounded-xl border border-[#e3e3e3] bg-white px-3 text-sm outline-none focus:border-[#142845]"
const textareaBase =
  "w-full min-h-[80px] rounded-xl border border-[#e3e3e3] bg-white px-3 py-2 text-sm outline-none focus:border-[#142845]"

function TextInput({ field, pathPrefix, value, onChange }: FieldProps) {
  if (field.kind !== "text" && field.kind !== "email") return null
  const fullKey = pathPrefix ? `${pathPrefix}.${field.key}` : field.key
  const current = (getAt(value, fullKey) ?? "") as string
  return (
    <div>
      <Label required={field.required} filled={isFilled(current)}>{field.label}</Label>
      <input
        type={field.kind}
        className={inputBase}
        placeholder={field.placeholder}
        value={current}
        onChange={(e) => onChange(setAt(value, fullKey, e.target.value))}
      />
      {field.hint ? <p className="mt-1 text-[10px] text-[#888]">{field.hint}</p> : null}
    </div>
  )
}

function TextareaInput({ field, pathPrefix, value, onChange }: FieldProps) {
  if (field.kind !== "textarea") return null
  const fullKey = pathPrefix ? `${pathPrefix}.${field.key}` : field.key
  const current = (getAt(value, fullKey) ?? "") as string
  return (
    <div>
      <Label required={field.required} filled={isFilled(current)}>{field.label}</Label>
      <textarea
        className={textareaBase}
        placeholder={field.placeholder}
        value={current}
        onChange={(e) => onChange(setAt(value, fullKey, e.target.value))}
      />
      {field.hint ? <p className="mt-1 text-[10px] text-[#888]">{field.hint}</p> : null}
    </div>
  )
}

function NumberInput({ field, pathPrefix, value, onChange }: FieldProps) {
  if (field.kind !== "number" && field.kind !== "integer") return null
  const fullKey = pathPrefix ? `${pathPrefix}.${field.key}` : field.key
  const current = getAt(value, fullKey)
  const display = current === undefined || current === null ? "" : String(current)
  return (
    <div>
      <Label required={field.required} filled={isFilled(current)}>{field.label}</Label>
      <input
        type="number"
        className={inputBase}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
        value={display}
        step={field.kind === "integer" ? 1 : "any"}
        onChange={(e) => {
          const raw = e.target.value
          if (raw === "") {
            onChange(setAt(value, fullKey, null))
            return
          }
          const parsed =
            field.kind === "integer" ? Number.parseInt(raw, 10) : Number.parseFloat(raw)
          onChange(setAt(value, fullKey, Number.isFinite(parsed) ? parsed : null))
        }}
      />
    </div>
  )
}

function MoneyInput({ field, pathPrefix, value, onChange }: FieldProps) {
  if (field.kind !== "money") return null
  const fullKey = pathPrefix ? `${pathPrefix}.${field.key}` : field.key
  const current = getAt(value, fullKey)
  // We store as bigint cents internally; display as decimal currency units.
  const display =
    typeof current === "bigint"
      ? (Number(current) / 100).toFixed(2)
      : current == null
        ? ""
        : String(current)
  return (
    <div>
      <Label required={field.required} filled={isFilled(current)}>{field.label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#555]">
          {field.currency ?? "AED"}
        </span>
        <input
          type="text"
          inputMode="decimal"
          className={`${inputBase} pl-14`}
          placeholder={field.placeholder ?? "0.00"}
          value={display}
          onChange={(e) => {
            const raw = e.target.value.replace(/[,\s]/g, "")
            if (raw === "") {
              onChange(setAt(value, fullKey, null))
              return
            }
            const num = Number.parseFloat(raw)
            if (!Number.isFinite(num)) return
            const cents = BigInt(Math.round(num * 100))
            onChange(setAt(value, fullKey, cents))
          }}
        />
      </div>
    </div>
  )
}

function PercentInput({ field, pathPrefix, value, onChange }: FieldProps) {
  if (field.kind !== "percent") return null
  const fullKey = pathPrefix ? `${pathPrefix}.${field.key}` : field.key
  const current = getAt(value, fullKey)
  const display = current === undefined || current === null ? "" : String(current)
  return (
    <div>
      <Label required={field.required} filled={isFilled(current)}>{field.label}</Label>
      <div className="relative">
        <input
          type="number"
          className={`${inputBase} pr-8`}
          placeholder="0"
          min={field.min ?? 0}
          max={field.max ?? 100}
          step="0.01"
          value={display}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === "") {
              onChange(setAt(value, fullKey, null))
              return
            }
            const num = Number.parseFloat(raw)
            onChange(setAt(value, fullKey, Number.isFinite(num) ? num : null))
          }}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#555]">%</span>
      </div>
    </div>
  )
}

function DateInput({ field, pathPrefix, value, onChange }: FieldProps) {
  if (field.kind !== "date") return null
  const fullKey = pathPrefix ? `${pathPrefix}.${field.key}` : field.key
  const current = (getAt(value, fullKey) ?? "") as string
  return (
    <div>
      <Label required={field.required} filled={isFilled(current)}>{field.label}</Label>
      <input
        type="date"
        className={inputBase}
        value={current}
        onChange={(e) => onChange(setAt(value, fullKey, e.target.value))}
      />
    </div>
  )
}

function SelectInput({ field, pathPrefix, value, onChange }: FieldProps) {
  if (field.kind !== "select") return null
  const fullKey = pathPrefix ? `${pathPrefix}.${field.key}` : field.key
  const current = (getAt(value, fullKey) ?? "") as string
  return (
    <div>
      <Label required={field.required} filled={isFilled(current)}>{field.label}</Label>
      <select
        className={inputBase}
        value={current}
        onChange={(e) => onChange(setAt(value, fullKey, e.target.value))}
      >
        <option value="">Select…</option>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function BooleanInput({ field, pathPrefix, value, onChange }: FieldProps) {
  if (field.kind !== "boolean") return null
  const fullKey = pathPrefix ? `${pathPrefix}.${field.key}` : field.key
  const current = Boolean(getAt(value, fullKey) ?? field.default ?? false)
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={current}
        onChange={(e) => onChange(setAt(value, fullKey, e.target.checked))}
        className="size-4 rounded border-[#e3e3e3]"
      />
      <span className="text-sm text-[#142845]">{field.label}</span>
    </label>
  )
}

function ReadonlyNote({ field }: { field: ManualFieldConfig }) {
  if (field.kind !== "readonly-note") return null
  const tone =
    field.severity === "warning"
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : "bg-blue-50 border-blue-100 text-blue-900"
  return (
    <div className={`text-xs rounded-lg border px-3 py-2 ${tone}`}>{field.text}</div>
  )
}

function GroupBlock({
  field,
  pathPrefix,
  value,
  onChange,
}: FieldProps) {
  if (field.kind !== "group") return null
  return (
    <fieldset className="border-t border-[#e9e9e9] pt-4">
      <legend className="text-sm font-semibold text-[#142845] mb-1">{field.label}</legend>
      {field.description ? (
        <p className="text-xs text-[#888] mb-3">{field.description}</p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field.fields.map((sub, i) => (
          <Fragment key={`group-${i}`}>
            <FieldRenderer
              field={sub}
              pathPrefix={pathPrefix}
              value={value}
              onChange={onChange}
            />
          </Fragment>
        ))}
      </div>
    </fieldset>
  )
}

function RepeatingRows({ field, pathPrefix, value, onChange }: FieldProps) {
  if (field.kind !== "repeating-rows") return null
  const fullKey = pathPrefix ? `${pathPrefix}.${field.key}` : field.key
  const rowsRaw = getAt(value, fullKey)
  // Scalar rowFields (a single field with key "value") store DB rows as
  // flat strings/numbers but the form needs {value: X} per row. Wrap on read.
  const firstRowField = field.rowFields[0]
  const isScalarRowField =
    field.rowFields.length === 1 &&
    firstRowField !== undefined &&
    "key" in firstRowField &&
    firstRowField.key === "value"
  const rows = Array.isArray(rowsRaw)
    ? (rowsRaw.map((r) =>
        isScalarRowField && (typeof r === "string" || typeof r === "number")
          ? { value: r }
          : r,
      ) as Record<string, Value>[])
    : []

  const setRows = (next: Record<string, Value>[]) => onChange(setAt(value, fullKey, next))

  const addRow = () => setRows([...rows, {}])
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i))
  const updateRow = (i: number, next: Record<string, Value>) => {
    const cloned = [...rows]
    cloned[i] = next
    setRows(cloned)
  }

  return (
    <div className="col-span-2">
      <Label filled={isFilled(rows)}>{field.label}</Label>
      <div className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="text-xs text-[#888] italic">No rows yet.</p>
        ) : null}
        {rows.map((row, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#e3e3e3] bg-[#fafafa] p-3 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#888]">
                Row {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-[#c32a4f] hover:bg-red-50 rounded p-1"
                aria-label="Remove row"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {field.rowFields.map((sub, j) => (
                <FieldRenderer
                  key={`row-${i}-field-${j}`}
                  field={sub}
                  pathPrefix=""
                  value={row}
                  onChange={(next) => updateRow(i, next)}
                  rowMode
                />
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#142845] hover:bg-[#e2edf7] rounded-lg px-3 py-2 border border-dashed border-[#b9d2eb] w-fit"
        >
          <Plus className="size-3.5" />
          {field.addLabel ?? `+ Add ${field.label.toLowerCase()}`}
        </button>
      </div>
    </div>
  )
}

function CompanyPickerStub({ field, pathPrefix, value, onChange }: FieldProps) {
  if (field.kind !== "company-picker") return null
  // Stub: text input for now. Full company-picker (queries companies module)
  // lands in D8.
  const fullKey = pathPrefix ? `${pathPrefix}.${field.key}` : field.key
  const current = (getAt(value, fullKey) ?? "") as string
  return (
    <div>
      <Label required={field.required} filled={isFilled(current)}>{field.label}</Label>
      <input
        type="text"
        className={inputBase}
        placeholder="Company name (full picker in D8)"
        value={current}
        onChange={(e) => onChange(setAt(value, fullKey, e.target.value))}
      />
    </div>
  )
}

function FieldRenderer(props: FieldProps): React.ReactElement | null {
  const { field } = props
  switch (field.kind) {
    case "text":
    case "email":
      return <TextInput {...props} />
    case "textarea":
      return <TextareaInput {...props} />
    case "number":
    case "integer":
      return <NumberInput {...props} />
    case "money":
      return <MoneyInput {...props} />
    case "percent":
      return <PercentInput {...props} />
    case "date":
      return <DateInput {...props} />
    case "select":
      return <SelectInput {...props} />
    case "boolean":
      return <BooleanInput {...props} />
    case "readonly-note":
      return <ReadonlyNote field={field} />
    case "group":
      return <GroupBlock {...props} />
    case "repeating-rows":
      return <RepeatingRows {...props} />
    case "company-picker":
      return <CompanyPickerStub {...props} />
    case "address":
    case "signature-block":
      // composite renderers — full version in D8
      return (
        <ReadonlyNote
          field={{
            kind: "readonly-note",
            text: `${field.label}: composite renderer lands in D8.`,
            severity: "info",
          }}
        />
      )
    default:
      return null
  }
}

// -----------------------------------------------------------------------------
// Public component
// -----------------------------------------------------------------------------

export interface DynamicFormProps<T extends Record<string, unknown>> {
  fields: ManualFieldConfig[]
  initialValue?: Partial<T>
  onSubmit: (value: T) => void | Promise<void>
  submitLabel?: string
  disabled?: boolean
  /** If set, renders <form id={formId}> so an external <button form={formId}>
   *  can submit it from outside (e.g. modal footer). */
  formId?: string
  /** Hide the internal submit button — caller renders one externally. */
  hideSubmit?: boolean
}

export function DynamicForm<T extends Record<string, unknown>>({
  fields,
  initialValue = {},
  onSubmit,
  submitLabel = "Save",
  disabled = false,
  formId,
  hideSubmit = false,
}: DynamicFormProps<T>) {
  const [value, setValue] = useState<Record<string, Value>>(initialValue as Record<string, Value>)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setSubmitting(true)
      try {
        await onSubmit(value as T)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed")
      } finally {
        setSubmitting(false)
      }
    },
    [value, onSubmit],
  )

  return (
    <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-6">
        {fields.map((field, i) => (
          <FieldRenderer
            key={`field-${i}`}
            field={field}
            pathPrefix=""
            value={value}
            onChange={setValue}
          />
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className={hideSubmit ? "hidden" : "flex justify-end pt-2 border-t border-[#e9e9e9]"}>
        <button
          type="submit"
          disabled={submitting || disabled}
          className="bg-[#142845] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-[#0e1d34] disabled:bg-[#c4c4c4] disabled:cursor-not-allowed"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  )
}
