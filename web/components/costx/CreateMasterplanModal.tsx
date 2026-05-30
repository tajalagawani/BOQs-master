"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Calendar as CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { currencies } from "@/constants";
import { generateQuarterDates } from "@/utils/dropdownOptions";
import type {
  MasterplanFormData,
  PhaseTimeline,
} from "@/types/masterplan";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface ProjectTeamMember {
  userId: string;
  name: string | null;
  email: string;
  role?: string;
  userRole?: string;
}

interface Project {
  id: string;
  name: string;
  currency?: string;
  teamMembers?: ProjectTeamMember[];
}

interface MasterplanToEdit {
  id: string;
  name: string;
  description?: string;
  currency: string;
  initialBudget?: number;
  grossLandArea: number;
  numberOfPhases: number;
  developmentManager: string;
  targetFAR?: number;
  status: string;
  baseDate: string;
  projectId?: string | null;
  phases?: Array<{
    phaseNumber: number;
    phaseName: string;
    startDate: string;
    totalMonths: number;
  }>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MasterplanFormData) => void;
  onUpdate?: (id: string, data: MasterplanFormData) => void;
  users?: User[];
  projects?: Project[];
  defaultProjectId?: string;
  defaultProjectName?: string;
  defaultGrossLandArea?: number;
  defaultLatitude?: number;
  defaultLongitude?: number;
  defaultCurrency?: string;
  projectTeamMembers?: ProjectTeamMember[];
  masterplanToEdit?: MasterplanToEdit | null;
}

/** Quarter-arithmetic helpers — ported verbatim from roshn. */
function calculateNextStartDate(
  prevStartDate: string,
  prevTotalMonths: number,
  quarterDates: string[],
): string {
  const match = prevStartDate.match(/^(\d)Q(\d{2})$/);
  if (!match) {
    return quarterDates.length > 4 ? quarterDates[4] : quarterDates[0];
  }
  const startQuarter = parseInt(match[1]);
  const startYear = 2000 + parseInt(match[2]);
  const quartersToAdd = Math.ceil(prevTotalMonths / 3);
  let endQuarter = startQuarter + quartersToAdd;
  let endYear = startYear;
  while (endQuarter > 4) {
    endQuarter -= 4;
    endYear += 1;
  }
  const nextDate = `${endQuarter}Q${endYear.toString().slice(-2)}`;
  if (quarterDates.includes(nextDate)) return nextDate;
  const nextIndex = quarterDates.findIndex((q) => {
    const qMatch = q.match(/^(\d)Q(\d{2})$/);
    if (!qMatch) return false;
    const qYear = 2000 + parseInt(qMatch[2]);
    const qQuarter = parseInt(qMatch[1]);
    return qYear > endYear || (qYear === endYear && qQuarter >= endQuarter);
  });
  return nextIndex >= 0
    ? quarterDates[nextIndex]
    : quarterDates[quarterDates.length - 1];
}

function generateDefaultPhases(
  count: number,
  defaultDuration = 36,
): PhaseTimeline[] {
  const phases: PhaseTimeline[] = [];
  const quarterDates = generateQuarterDates();
  const defaultStartDate =
    quarterDates.length > 4 ? quarterDates[4] : quarterDates[0];

  for (let i = 1; i <= count; i++) {
    let startDate: string;
    if (i === 1) {
      startDate = defaultStartDate;
    } else {
      const prevPhase = phases[i - 2];
      startDate = calculateNextStartDate(
        prevPhase.startDate,
        prevPhase.totalMonths,
        quarterDates,
      );
    }
    phases.push({
      phaseNumber: i,
      phaseName: `Phase ${i}`,
      startDate,
      totalMonths: defaultDuration,
    });
  }
  return phases;
}

const initialFormData: MasterplanFormData = {
  name: "",
  developmentManager: "",
  numberOfPhases: 1,
  phases: generateDefaultPhases(1),
  grossLandArea: 0,
  currency: "SAR",
  baseDate: "",
  members: [],
};

function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CreateMasterplanModal({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  users = [],
  projects = [],
  defaultProjectId,
  defaultProjectName,
  defaultGrossLandArea,
  defaultLatitude,
  defaultLongitude,
  defaultCurrency,
  projectTeamMembers = [],
  masterplanToEdit,
}: Props) {
  const isEditMode = !!masterplanToEdit;

  const defaultName = defaultProjectName
    ? `${defaultProjectName}-MP-${generateShortId()}`
    : "";

  const [formData, setFormData] = useState<MasterplanFormData>({
    ...initialFormData,
    name: defaultName,
    projectId: defaultProjectId,
    grossLandArea: defaultGrossLandArea || 0,
    latitude: defaultLatitude,
    longitude: defaultLongitude,
    currency: defaultCurrency || "SAR",
    phases: generateDefaultPhases(1),
  });
  const [baseDateStr, setBaseDateStr] = useState<string>("");

  const quarterDateOptions = useMemo(() => generateQuarterDates(), []);

  // Development managers come from the selected project's team
  const developmentManagers = useMemo(() => {
    const selectedProjectId = formData.projectId || defaultProjectId;
    if (
      projectTeamMembers.length > 0 &&
      selectedProjectId === defaultProjectId
    ) {
      return projectTeamMembers.filter(
        (tm) => tm.userRole === "DEVELOPMENT_MANAGER",
      );
    }
    if (selectedProjectId) {
      const selected = projects.find((p) => p.id === selectedProjectId);
      if (selected?.teamMembers) {
        return selected.teamMembers.filter(
          (tm) => tm.userRole === "DEVELOPMENT_MANAGER",
        );
      }
    }
    return [];
  }, [formData.projectId, defaultProjectId, projectTeamMembers, projects]);

  // Reset / populate form when the modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (masterplanToEdit) {
      const existingPhases =
        masterplanToEdit.phases && masterplanToEdit.phases.length > 0
          ? masterplanToEdit.phases
          : generateDefaultPhases(masterplanToEdit.numberOfPhases);

      setFormData({
        name: masterplanToEdit.name,
        description: masterplanToEdit.description || "",
        currency: masterplanToEdit.currency,
        initialBudget: masterplanToEdit.initialBudget,
        grossLandArea: masterplanToEdit.grossLandArea,
        numberOfPhases:
          masterplanToEdit.numberOfPhases || existingPhases.length,
        developmentManager: masterplanToEdit.developmentManager,
        targetFAR: masterplanToEdit.targetFAR,
        phases: existingPhases,
        members: [],
        baseDate: masterplanToEdit.baseDate || "",
        projectId: masterplanToEdit.projectId || undefined,
      });
      setBaseDateStr(masterplanToEdit.baseDate?.slice(0, 10) || "");
      return;
    }

    const newDefaultName = defaultProjectName
      ? `${defaultProjectName}-MP-${generateShortId()}`
      : "";

    let autoSelectedManager = "";
    const devManagers = projectTeamMembers.filter(
      (tm) => tm.userRole === "DEVELOPMENT_MANAGER",
    );
    if (devManagers.length === 1) {
      autoSelectedManager = devManagers[0].name || devManagers[0].email;
    }

    setFormData({
      ...initialFormData,
      name: newDefaultName,
      projectId: defaultProjectId,
      grossLandArea: defaultGrossLandArea || 0,
      latitude: defaultLatitude,
      longitude: defaultLongitude,
      currency: defaultCurrency || "SAR",
      developmentManager: autoSelectedManager,
      phases: generateDefaultPhases(1),
    });
    setBaseDateStr("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, masterplanToEdit]);

  // ── Handlers (matching roshn behaviour) ──────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    const numericFields = [
      "numberOfPhases",
      "grossLandArea",
      "initialBudget",
      "targetFAR",
      "latitude",
      "longitude",
    ];

    if (name === "numberOfPhases") {
      const newCount = Math.max(1, Math.min(10, Number(value) || 1));
      const currentPhases = formData.phases || [];
      const newPhases: PhaseTimeline[] = [];
      for (let i = 1; i <= newCount; i++) {
        if (i <= currentPhases.length) {
          newPhases.push(currentPhases[i - 1]);
        } else {
          let startDate: string;
          if (newPhases.length > 0) {
            const prev = newPhases[newPhases.length - 1];
            startDate = calculateNextStartDate(
              prev.startDate,
              prev.totalMonths,
              quarterDateOptions,
            );
          } else {
            startDate =
              quarterDateOptions.length > 4
                ? quarterDateOptions[4]
                : quarterDateOptions[0];
          }
          newPhases.push({
            phaseNumber: i,
            phaseName: `Phase ${i}`,
            startDate,
            totalMonths: 36,
          });
        }
      }
      setFormData((prev) => ({
        ...prev,
        numberOfPhases: newCount,
        phases: newPhases,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        numericFields.includes(name) && value !== "" ? Number(value) : value,
    }));
  };

  const handlePhaseChange = (
    phaseIndex: number,
    field: keyof PhaseTimeline,
    value: string | number,
  ) => {
    setFormData((prev) => {
      const updated = [...(prev.phases || [])];
      if (updated[phaseIndex]) {
        updated[phaseIndex] = {
          ...updated[phaseIndex],
          [field]: field === "totalMonths" ? Number(value) : value,
        };
      }
      return { ...prev, phases: updated };
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "projectId") {
      const selected = projects.find((p) => p.id === value);
      setFormData((prev) => ({
        ...prev,
        projectId: value || undefined,
        developmentManager: "",
        currency: selected?.currency || "SAR",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddMember = (userId: string) => {
    if (!userId || formData.members?.includes(userId)) return;
    setFormData((prev) => ({
      ...prev,
      members: [...(prev.members || []), userId],
    }));
  };

  const handleRemoveMember = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members?.filter((id) => id !== userId) || [],
    }));
  };

  const availableUsers = users.filter(
    (u) => !formData.members?.includes(u.id),
  );
  const selectedUsers = users.filter((u) => formData.members?.includes(u.id));

  const handleSubmit = () => {
    if (isEditMode && masterplanToEdit && onUpdate) {
      onUpdate(masterplanToEdit.id, formData);
    } else {
      onSubmit(formData);
    }
  };

  // Esc-to-close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4 py-6">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
          <div>
            <div className="text-base font-semibold text-zinc-900">
              {isEditMode
                ? "Edit Masterplan Details"
                : "Create Masterplan Estimate"}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Enter all relevant masterplan information below.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 inline-flex items-center justify-center rounded-md hover:bg-zinc-100"
          >
            <X className="size-4 text-zinc-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
          <Field label="Masterplan Name" required>
            <input
              required
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter masterplan name"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Initial Budget">
              <input
                name="initialBudget"
                type="number"
                value={formData.initialBudget || ""}
                onChange={handleChange}
                placeholder="Enter initial budget"
                className={inputCls}
              />
            </Field>

            <Field label="Development Manager" required>
              {developmentManagers.length > 0 ? (
                <select
                  value={formData.developmentManager}
                  onChange={(e) =>
                    handleSelectChange("developmentManager", e.target.value)
                  }
                  className={inputCls}
                >
                  <option value="">Select development manager</option>
                  {developmentManagers.map((dm) => (
                    <option
                      key={dm.userId}
                      value={dm.name || dm.email}
                    >
                      {dm.name || dm.email}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name="developmentManager"
                  value={formData.developmentManager}
                  onChange={handleChange}
                  placeholder="Enter development manager"
                  className={inputCls}
                />
              )}
            </Field>

            <Field label="No. of Phases" required>
              <input
                required
                name="numberOfPhases"
                type="number"
                min={1}
                max={10}
                value={formData.numberOfPhases}
                onChange={handleChange}
                className={inputCls}
              />
            </Field>

            <Field label="Gross Land Area (sqm)" required>
              <input
                required
                name="grossLandArea"
                type="number"
                value={formData.grossLandArea || ""}
                onChange={handleChange}
                placeholder="Enter gross land area"
                disabled={!!defaultGrossLandArea}
                className={cn(inputCls, defaultGrossLandArea && "bg-zinc-50")}
              />
            </Field>

            <Field label="Project Currency" required>
              <select
                value={formData.currency}
                onChange={(e) =>
                  handleSelectChange("currency", e.target.value)
                }
                className={inputCls}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.symbol} ({c.name})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Target FAR">
              <input
                name="targetFAR"
                type="number"
                step="0.001"
                value={formData.targetFAR || ""}
                onChange={handleChange}
                placeholder="Enter target FAR"
                className={inputCls}
              />
            </Field>

            <Field label="Latitude">
              <input
                name="latitude"
                type="number"
                step="0.0001"
                value={formData.latitude || ""}
                onChange={handleChange}
                placeholder="Enter latitude"
                className={inputCls}
              />
            </Field>

            <Field label="Longitude">
              <input
                name="longitude"
                type="number"
                step="0.0001"
                value={formData.longitude || ""}
                onChange={handleChange}
                placeholder="Enter longitude"
                className={inputCls}
              />
            </Field>
          </div>

          {/* Phase Timeline */}
          {formData.numberOfPhases > 0 &&
            formData.phases &&
            formData.phases.length > 0 && (
              <div className="border-t border-zinc-100 pt-4">
                <div className="text-sm font-semibold text-zinc-900 mb-1">
                  Phase Timeline
                </div>
                <p className="text-xs text-zinc-500 mb-3">
                  Configure the start date and duration for each phase. Phases
                  can overlap.
                </p>
                <div className="space-y-2.5">
                  {formData.phases.map((phase, index) => (
                    <div
                      key={phase.phaseNumber}
                      className="grid grid-cols-3 gap-3 items-end p-3 bg-zinc-50 rounded-xl"
                    >
                      <div>
                        <span className="block text-xs font-medium text-zinc-700">
                          {phase.phaseName}
                        </span>
                      </div>
                      <Field label="Start Date" small>
                        <select
                          value={phase.startDate}
                          onChange={(e) =>
                            handlePhaseChange(
                              index,
                              "startDate",
                              e.target.value,
                            )
                          }
                          className={inputCls}
                        >
                          {quarterDateOptions.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Total Months" small>
                        <input
                          type="number"
                          min={6}
                          max={120}
                          value={phase.totalMonths}
                          onChange={(e) =>
                            handlePhaseChange(
                              index,
                              "totalMonths",
                              e.target.value,
                            )
                          }
                          className={inputCls}
                        />
                      </Field>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Base date — native date input */}
          <Field label="Base date" required>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              <input
                type="date"
                value={baseDateStr}
                onChange={(e) => {
                  setBaseDateStr(e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    baseDate: e.target.value,
                  }));
                }}
                className={cn(inputCls, "pl-10")}
              />
            </div>
          </Field>

          {/* Project picker — shown when editing or no defaultProjectId */}
          {(isEditMode || !defaultProjectId) && (
            <Field label="Project">
              <select
                value={formData.projectId || ""}
                onChange={(e) =>
                  handleSelectChange("projectId", e.target.value)
                }
                className={inputCls}
              >
                <option value="">Select project</option>
                {projects.length === 0 ? (
                  <option disabled value="">
                    No projects available
                  </option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                )}
              </select>
            </Field>
          )}

          {/* Team Members */}
          <Field label="Team Members">
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-zinc-100 text-zinc-800 text-xs rounded-full"
                  >
                    {user.name || user.email}
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(user.id)}
                      className="size-5 inline-flex items-center justify-center rounded-full hover:bg-zinc-900 hover:text-white transition-colors"
                    >
                      <X className="size-3" strokeWidth={2} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
              <select
                value=""
                onChange={(e) => handleAddMember(e.target.value)}
                className={cn(inputCls, "pl-9")}
              >
                <option value="">
                  {users.length === 0
                    ? "No users available"
                    : availableUsers.length === 0
                      ? "All users added"
                      : "Add team member…"}
                </option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="Description">
            <textarea
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              rows={3}
              placeholder="Enter description"
              className={cn(inputCls, "py-2 resize-y")}
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-zinc-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-xl bg-white border border-zinc-200 hover:border-zinc-400 text-sm font-medium text-zinc-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="h-10 px-5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-sm font-medium text-white"
          >
            {isEditMode ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reusable form primitives ─────────────────────────────────────────
const inputCls =
  "w-full h-10 px-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-500";

function Field({
  label,
  required,
  small,
  children,
}: {
  label: string;
  required?: boolean;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className={cn(
          "font-medium text-zinc-700",
          small ? "text-[11px]" : "text-xs",
        )}
      >
        {label}
        {required && <span className="text-rose-600 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
