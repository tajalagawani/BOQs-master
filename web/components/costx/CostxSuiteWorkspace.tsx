"use client";

/**
 * ioMaster module home — rebuilt on the 10X Suite design system.
 * Navy topnav + hero, then a white roster panel: portfolio tiles over a
 * searchable Cards/Table view of every masterplan estimate. Faithful restyle
 * of MasterplanListClient — same data, props, hrefs, actions and behavior.
 */
import { useState, useMemo } from "react";
import type { Key } from "react-aria-components/Breadcrumbs";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  X,
  LayoutGrid,
  Table as TableIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import { Segment } from "@heroui-pro/react";

import CreateMasterplanModal from "@/components/costx/CreateMasterplanModal";
import type { ProjectPulseData } from "@/lib/pulse/types";
import { CostxCard, type CostxCardStatus } from "@/components/costx/CostxCard";
import {
  SuiteRails,
  SuiteTopNav,
  SuiteHero,
  SuiteProjectPill,
  SuitePanel,
  SecBar,
  SuiteTiles,
  SuiteTable,
  SuiteButton,
  SuiteChip,
  CodeBadge,
  ChatFab,
  type SuiteTileData,
} from "@/components/suite";
import type { SuiteTone } from "@/components/suite";
import Pagination from "@/components/costx/Pagination";
import ConfirmDialog from "@/components/costx/ConfirmDialog";
import {
  createMasterplan,
  deleteMasterplan,
  updateMasterplan,
} from "@/actions/masterplans";
import type {
  MasterplanFormData,
  MasterplanEstimate,
  MasterplanStatus,
} from "@/types/masterplan";
import { formatNumber, formatDate } from "@/utils/formatters";
import { cn } from "@/lib/cn";

type FilterType = "all" | "created" | "shared";
const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All masterplans" },
  { key: "created", label: "Created by me" },
  { key: "shared", label: "Shared with me" },
];

/* ----------------------------------------------------------------------------
 * Polygon area (kept from roshn — used to prefill GLA when filtering by project)
 * -------------------------------------------------------------------------- */
function calculatePolygonArea(polygon: number[][]): number {
  if (!polygon || polygon.length < 3) return 0;
  const toMeters = (lng: number, lat: number) => {
    const latRad = (lat * Math.PI) / 180;
    const mPerDegLng = 111320 * Math.cos(latRad);
    const mPerDegLat = 110574;
    return { x: lng * mPerDegLng, y: lat * mPerDegLat };
  };
  const centroid = polygon.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 },
  );
  centroid.lng /= polygon.length;
  centroid.lat /= polygon.length;
  const meters = polygon.map(([lng, lat]) =>
    toMeters(lng - centroid.lng, lat - centroid.lat),
  );
  let area = 0;
  for (let i = 0; i < meters.length; i++) {
    const j = (i + 1) % meters.length;
    area += meters[i].x * meters[j].y;
    area -= meters[j].x * meters[i].y;
  }
  return Math.abs(area / 2);
}

/* ----------------------------------------------------------------------------
 * Types matching what the page passes in
 * -------------------------------------------------------------------------- */
interface MasterplanTeamMember {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string };
}

export interface MasterplanListEntry {
  id: string;
  name: string;
  description: string | null;
  grossLandArea: number;
  calculatedPlotArea: number;
  balanceExternalArea: number;
  totalUnits: number;
  parkingSpaces: number;
  contingency: number;
  totalCost: number;
  costPerGfa: number;
  assetClass: string;
  assetTypeL1: string;
  assetFormL2: string | null;
  status: string;
  version: number;
  benchmarkProjectId: string | null;
  numberOfPhases?: number;
  phases?: {
    phaseNumber: number;
    phaseName: string;
    startDate: string;
    totalMonths: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; name: string | null; email: string };
  teamMembers: MasterplanTeamMember[];
}

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
  polygon?: number[][] | null;
  latitude?: number | null;
  longitude?: number | null;
  teamMembers?: ProjectTeamMember[];
}

interface Permissions {
  role: string | null;
  canCreateProject: boolean;
  canCreateMasterplan: boolean;
  canManageUsers: boolean;
  isAdmin: boolean;
  isDevelopmentManager?: boolean;
  isViewer?: boolean;
}

interface Props {
  initialMasterplans: MasterplanListEntry[];
  users?: User[];
  projects?: Project[];
  permissions: Permissions;
  currentUserEmail: string;
  pulse?: ProjectPulseData;
}

/* Masterplan status → suite chip tone (mirrors MasterplanTable's StatusPill). */
function statusTone(status: string): SuiteTone {
  switch (status) {
    case "ACTIVE":
      return "good";
    case "DRAFT":
    case "ARCHIVED":
      return "neut";
    default:
      return "warn";
  }
}

/* ----------------------------------------------------------------------------
 * Client component
 * -------------------------------------------------------------------------- */
export default function CostxSuiteWorkspace({
  initialMasterplans,
  users = [],
  projects = [],
  permissions,
  currentUserEmail,
  pulse,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectFilter = searchParams.get("project");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });
  const [editModal, setEditModal] = useState<{
    open: boolean;
    masterplan: MasterplanEstimate | null;
  }>({ open: false, masterplan: null });

  const filteredProject = useMemo(() => {
    if (!projectFilter) return null;
    return projects.find((p) => p.id === projectFilter) || null;
  }, [projectFilter, projects]);

  const filteredMasterplans = useMemo(() => {
    let f = [...initialMasterplans];
    if (projectFilter) f = f.filter((mp) => mp.benchmarkProjectId === projectFilter);
    if (filter === "created") {
      f = f.filter((mp) => mp.createdBy.email === currentUserEmail);
    } else if (filter === "shared") {
      f = f.filter((mp) => mp.createdBy.email !== currentUserEmail);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      f = f.filter(
        (mp) =>
          mp.name.toLowerCase().includes(q) ||
          (mp.description ?? "").toLowerCase().includes(q) ||
          (mp.assetClass ?? "").toLowerCase().includes(q) ||
          (mp.createdBy.name ?? mp.createdBy.email).toLowerCase().includes(q),
      );
    }
    return f;
  }, [initialMasterplans, projectFilter, filter, currentUserEmail, search]);

  const modalUsers = useMemo(() => {
    if (!filteredProject?.teamMembers?.length) return users;
    const ids = filteredProject.teamMembers.map((tm) => tm.userId);
    return users.filter((u) => ids.includes(u.id));
  }, [filteredProject, users]);

  const projectArea = useMemo(() => {
    if (!filteredProject?.polygon) return undefined;
    return Math.round(calculatePolygonArea(filteredProject.polygon));
  }, [filteredProject]);

  /* Convert masterplans to the table-friendly shape, identical to roshn */
  const estimates: MasterplanEstimate[] = filteredMasterplans.map((mp) => ({
    id: mp.id,
    name: mp.name,
    description: mp.description || "",
    currency: "SAR",
    initialBudget: mp.totalCost,
    grossLandArea: mp.grossLandArea,
    numberOfPhases: mp.numberOfPhases || mp.phases?.length || 1,
    developmentManager: mp.createdBy.name || mp.createdBy.email,
    targetFAR: mp.grossLandArea
      ? mp.calculatedPlotArea / mp.grossLandArea
      : undefined,
    status: mp.status as MasterplanStatus,
    baseDate: mp.createdAt.toISOString(),
    latitude: undefined,
    longitude: undefined,
    projectId: mp.benchmarkProjectId ?? undefined,
    members:
      mp.teamMembers?.map((tm) => ({
        id: tm.user.id,
        name: tm.user.name || tm.user.email,
        role: tm.role,
      })) || [],
    phases:
      mp.phases?.map((p) => ({
        phaseNumber: p.phaseNumber,
        phaseName: p.phaseName,
        startDate: p.startDate,
        totalMonths: p.totalMonths,
      })) || [],
    createdAt: mp.createdAt.toISOString(),
    updatedAt: mp.updatedAt.toISOString(),
  }));

  const pagedEstimates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return estimates.slice(start, start + pageSize);
  }, [estimates, currentPage, pageSize]);

  /* ----------------------------------------------------------------------
   * Mutation handlers — port of roshn's handleCreate / handleUpdate / handleDelete
   * -------------------------------------------------------------------- */
  const handleCreate = async (formData: MasterplanFormData) => {
    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("description", formData.description || "");
      data.append("grossLandArea", String(formData.grossLandArea));
      data.append(
        "calculatedPlotArea",
        String(formData.grossLandArea * (formData.targetFAR || 0.5)),
      );
      data.append("balanceExternalArea", String(formData.grossLandArea * 0.3));
      data.append("totalUnits", String(100));
      data.append("parkingSpaces", String(100));
      data.append(
        "contingency",
        String((formData.initialBudget || 0) * 0.1),
      );
      data.append("totalCost", String(formData.initialBudget || 0));
      data.append("costPerGfa", String(1500));
      data.append("assetClass", "Residential");
      data.append("assetTypeL1", "Multi Family");
      data.append("status", "DRAFT");
      if (formData.projectId) {
        data.append("benchmarkProjectId", formData.projectId);
      }
      if (formData.members && formData.members.length > 0) {
        data.append("memberIds", JSON.stringify(formData.members));
      }
      data.append("numberOfPhases", String(formData.numberOfPhases || 1));
      if (formData.phases && formData.phases.length > 0) {
        data.append("phases", JSON.stringify(formData.phases));
      }

      const result = await createMasterplan(data);
      if (result.success) {
        setIsModalOpen(false);
        toast.success("Masterplan created successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Error creating masterplan");
      }
    } catch {
      toast.error("Failed to create masterplan");
    }
  };

  const handleEdit = (id: string) => {
    const estimate = estimates.find((e) => e.id === id);
    if (estimate) setEditModal({ open: true, masterplan: estimate });
  };

  const handleUpdate = async (
    id: string,
    data: Partial<MasterplanFormData>,
  ) => {
    try {
      const result = await updateMasterplan(id, {
        name: data.name,
        description: data.description || undefined,
        grossLandArea: data.grossLandArea,
        totalCost: data.initialBudget,
        calculatedPlotArea: data.grossLandArea
          ? data.grossLandArea * (data.targetFAR || 0.5)
          : undefined,
        memberIds: data.members,
        benchmarkProjectId: data.projectId || null,
        numberOfPhases: data.numberOfPhases,
        phases: data.phases,
      });
      if (result.success) {
        setEditModal({ open: false, masterplan: null });
        toast.success("Masterplan updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Error updating masterplan");
      }
    } catch {
      toast.error("Failed to update masterplan");
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      setIsDeleting(deleteConfirm.id);
      const result = await deleteMasterplan(deleteConfirm.id);
      if (result.success) {
        toast.success("Masterplan deleted successfully");
        router.refresh();
        setDeleteConfirm({ open: false, id: null });
      } else {
        toast.error(result.error || "Error deleting masterplan");
      }
    } catch {
      toast.error("Failed to delete masterplan");
    } finally {
      setIsDeleting(null);
    }
  };

  const clearProjectFilter = () => router.push("/costx");

  /* ----- Portfolio tiles from the ioMaster pulse ----- */
  const tiles: SuiteTileData[] = (pulse?.metrics ?? []).map((m) => ({
    k: m.label,
    v: m.value,
    sub: m.sub,
  }));

  /* ----- Cards-view data (cap at 10 to keep the 5×2 wall like home) ----- */
  const cardEntries = filteredMasterplans.slice(0, 10).map((mp) => ({
    id: mp.id,
    name: mp.name,
    status: mp.status as CostxCardStatus,
    assetClass: [mp.assetClass, mp.assetTypeL1].filter(Boolean).join(" · ") || null,
    createdBy: mp.createdBy.name ?? mp.createdBy.email ?? null,
    gla: mp.grossLandArea ? `${mp.grossLandArea.toLocaleString()} m²` : null,
    totalCost: mp.totalCost
      ? mp.totalCost >= 1_000_000_000
        ? `SAR ${(mp.totalCost / 1_000_000_000).toFixed(2)}B`
        : mp.totalCost >= 1_000_000
          ? `SAR ${(mp.totalCost / 1_000_000).toFixed(2)}M`
          : `SAR ${mp.totalCost.toLocaleString()}`
      : null,
    href: `/costx/${mp.id}`,
  }));

  const cardBackgrounds = [
    "/card-cost-planning.png",
    "/card-parametric.png",
    "/card-estimates.png",
    "/card-reports.png",
    "/card-budget-control.png",
    "/card-change-orders.png",
    "/card-procurement.png",
    "/card-boqs.png",
  ];

  /* View toggle + All/Created/Shared chips + project-filter chip, in the SecBar. */
  const controls = (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* View toggle — Cards / Table */}
      <Segment
        selectedKey={view}
        onSelectionChange={(key: Key) => setView(key as "cards" | "table")}
      >
        <Segment.Item id="cards">
          <Segment.Separator />
          <span className="inline-flex items-center gap-1">
            <LayoutGrid className="size-3.5" strokeWidth={1.75} />
            Cards
          </span>
        </Segment.Item>
        <Segment.Item id="table">
          <Segment.Separator />
          <span className="inline-flex items-center gap-1">
            <TableIcon className="size-3.5" strokeWidth={1.75} />
            Table
          </span>
        </Segment.Item>
      </Segment>

      {/* All / Created / Shared chips */}
      <Segment
        selectedKey={filter}
        onSelectionChange={(key: Key) => setFilter(key as FilterType)}
      >
        {FILTER_OPTIONS.map((opt) => (
          <Segment.Item key={opt.key} id={opt.key}>
            <Segment.Separator />
            {opt.label}
          </Segment.Item>
        ))}
      </Segment>

      {filteredProject && (
        <div className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-0.5 bg-suite-card-soft text-suite-ink-2 text-[11px] rounded-full border border-suite-line">
          <span>Project: {filteredProject.name}</span>
          <button
            type="button"
            onClick={clearProjectFilter}
            className="size-5 inline-flex items-center justify-center rounded-full hover:bg-suite-neut-bg"
            title="Clear filter"
          >
            <X className="size-3" strokeWidth={2} />
          </button>
        </div>
      )}

      {permissions.canCreateMasterplan && (
        <SuiteButton variant="dark" onClick={() => setIsModalOpen(true)}>
          <Plus className="size-4" strokeWidth={2.25} />
          Create Masterplan
        </SuiteButton>
      )}
    </div>
  );

  const emptyState = (
    <EmptyState
      hasFilter={!!filteredProject}
      projectName={filteredProject?.name}
      canCreate={permissions.canCreateMasterplan}
      onCreate={() => setIsModalOpen(true)}
    />
  );

  const note =
    view === "cards" && filteredMasterplans.length > 10
      ? `Showing the first 10 of ${filteredMasterplans.length} matching masterplans — switch to the table view to see them all.`
      : undefined;

  return (
    <div className="suite min-h-full bg-suite-page pb-10">
      <SuiteRails />

      <SuiteTopNav
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search masterplans"
        crumb={<span className="font-semibold text-[#cdd6e6]">ioMaster</span>}
        notifications={1}
      />

      <SuiteHero
        title={
          <>
            io<span className="text-suite-amber">Master</span>
          </>
        }
        subtitle={
          <>
            {filteredMasterplans.length} masterplan
            {filteredMasterplans.length === 1 ? "" : "s"}
            {filteredProject ? ` in ${filteredProject.name}` : ""} — open a
            card to jump into the cost workspace.
          </>
        }
        right={
          pulse ? (
            <SuiteProjectPill
              label={pulse.hero.title}
              meta={pulse.hero.subtitle}
              accent="green"
            />
          ) : undefined
        }
      />

      <SuitePanel first>
        <SecBar
          title="Masterplans"
          count={`${filteredMasterplans.length} masterplan${
            filteredMasterplans.length === 1 ? "" : "s"
          }`}
          actions={controls}
        />

        {tiles.length > 0 && <SuiteTiles items={tiles} cols={4} className="mb-4" />}

        {note && (
          <p className="mb-3 text-[12px] text-suite-ink-3">{note}</p>
        )}

        {view === "cards" ? (
          cardEntries.length === 0 ? (
            emptyState
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {cardEntries.map((c, i) => (
                <CostxCard
                  key={c.id}
                  name={c.name}
                  status={c.status}
                  assetClass={c.assetClass}
                  createdBy={c.createdBy}
                  totalCost={c.totalCost}
                  gla={c.gla}
                  href={c.href}
                  backgroundImage={cardBackgrounds[i % cardBackgrounds.length]}
                />
              ))}
            </div>
          )
        ) : estimates.length === 0 ? (
          emptyState
        ) : (
          <>
            <SuiteTable>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "34%" }}>Masterplan Estimate</th>
                    <th className="r" style={{ width: "13%" }}>
                      Initial Budget
                    </th>
                    <th className="r" style={{ width: "13%" }}>
                      Gross Land Area&nbsp;(m²)
                    </th>
                    <th style={{ width: "10%" }}>Team</th>
                    <th className="r" style={{ width: "9%" }}>
                      Target FAR
                    </th>
                    <th style={{ width: "8%" }}>Status</th>
                    <th style={{ width: "9%" }}>Base Date</th>
                    <th className="r" style={{ width: "4%" }} />
                  </tr>
                </thead>
                <tbody>
                  {pagedEstimates.map((estimate, index) => (
                    <tr key={estimate.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <CodeBadge>M{index + 1}</CodeBadge>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <a
                                href={`/costx/${estimate.id}`}
                                className="truncate font-semibold text-suite-ink hover:underline"
                              >
                                {estimate.name}
                              </a>
                              <span className="inline-flex items-center rounded bg-suite-neut-bg px-1.5 py-0.5 text-[10px] font-medium text-suite-ink-2">
                                {estimate.currency}
                              </span>
                              <span className="inline-flex items-center rounded bg-suite-navy px-1.5 py-0.5 text-[10px] font-medium text-white">
                                {estimate.numberOfPhases}{" "}
                                {estimate.numberOfPhases === 1
                                  ? "Phase"
                                  : "Phases"}
                              </span>
                            </div>
                            <div className="truncate text-[11px] text-suite-ink-3">
                              {estimate.description || " "}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="r suite-num font-semibold text-suite-ink">
                        {formatNumber(estimate.initialBudget)}
                      </td>
                      <td className="r suite-num text-suite-ink-2">
                        {formatNumber(estimate.grossLandArea)}
                      </td>

                      <td>
                        <div className="flex -space-x-1.5">
                          {estimate.developmentManager && (
                            <Avatar
                              label={initials(estimate.developmentManager)}
                              title={`${estimate.developmentManager} (Manager)`}
                              tone="primary"
                              z={10}
                            />
                          )}
                          {estimate.members?.slice(0, 3).map((member, idx) => (
                            <Avatar
                              key={member.id}
                              label={initials(member.name)}
                              title={`${member.name} (${member.role})`}
                              tone="muted"
                              z={9 - idx}
                            />
                          ))}
                          {estimate.members && estimate.members.length > 3 && (
                            <Avatar
                              label={`+${estimate.members.length - 3}`}
                              title={`${estimate.members.length - 3} more members`}
                              tone="ghost"
                            />
                          )}
                        </div>
                      </td>

                      <td className="r suite-num text-suite-ink-2">
                        {estimate.targetFAR?.toFixed(3) || "—"}
                      </td>

                      <td>
                        <SuiteChip tone={statusTone(estimate.status)}>
                          {estimate.status}
                        </SuiteChip>
                      </td>

                      <td className="text-[11.5px] text-suite-ink-3">
                        {formatDate(estimate.baseDate)}
                      </td>

                      <td className="r">
                        <div className="flex items-center justify-end gap-1.5">
                          {permissions.canCreateMasterplan && (
                            <IconButton
                              label="Edit"
                              onClick={() => handleEdit(estimate.id)}
                            >
                              <Pencil className="size-3.5" strokeWidth={1.75} />
                            </IconButton>
                          )}
                          {permissions.isAdmin && (
                            <IconButton
                              label="Delete"
                              variant="danger"
                              onClick={() => handleDelete(estimate.id)}
                            >
                              <Trash2 className="size-3.5" strokeWidth={1.75} />
                            </IconButton>
                          )}
                          <SuiteButton
                            href={`/costx/${estimate.id}`}
                            variant="dark"
                            size="sm"
                          >
                            Open
                          </SuiteButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SuiteTable>
            <Pagination
              currentPage={currentPage}
              totalRecords={estimates.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </SuitePanel>

      <ChatFab />

      {/* Create / Edit modal */}
      <CreateMasterplanModal
        isOpen={isModalOpen || editModal.open}
        onClose={() => {
          setIsModalOpen(false);
          setEditModal({ open: false, masterplan: null });
        }}
        onSubmit={handleCreate}
        onUpdate={handleUpdate}
        masterplanToEdit={editModal.masterplan}
        users={modalUsers}
        projects={projects}
        defaultProjectId={projectFilter || undefined}
        defaultProjectName={filteredProject?.name}
        defaultGrossLandArea={projectArea}
        defaultLatitude={filteredProject?.latitude ?? undefined}
        defaultLongitude={filteredProject?.longitude ?? undefined}
        defaultCurrency={filteredProject?.currency}
        projectTeamMembers={filteredProject?.teamMembers}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          setDeleteConfirm({ open, id: open ? deleteConfirm.id : null })
        }
        title="Delete Masterplan"
        description="Are you sure you want to delete this masterplan estimate? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        loading={isDeleting !== null}
      />
    </div>
  );
}

function initials(s: string): string {
  return s
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Avatar({
  label,
  title,
  tone,
  z,
}: {
  label: string;
  title: string;
  tone: "primary" | "muted" | "ghost";
  z?: number;
}) {
  return (
    <div
      title={title}
      style={{ zIndex: z }}
      className={cn(
        "size-7 rounded-full inline-flex items-center justify-center text-[10.5px] font-medium border-2 border-white",
        tone === "primary" && "bg-suite-navy text-white",
        tone === "muted" && "bg-suite-ink-4 text-white",
        tone === "ghost" && "bg-suite-neut-bg text-suite-ink-2",
      )}
    >
      {label}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "size-7 inline-flex items-center justify-center rounded-md transition-colors",
        variant === "danger"
          ? "text-suite-ink-3 hover:bg-suite-dang-bg hover:text-suite-dang"
          : "text-suite-ink-3 hover:bg-suite-neut-bg hover:text-suite-ink",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({
  hasFilter,
  projectName,
  canCreate,
  onCreate,
}: {
  hasFilter: boolean;
  projectName?: string;
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="grid place-items-center rounded-[14px] border border-suite-line bg-suite-card-soft py-16 text-center">
      <div className="flex flex-col items-center px-6">
        <div className="size-14 rounded-2xl bg-suite-neut-bg inline-flex items-center justify-center mb-4">
          <svg
            className="size-6 text-suite-ink-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-base font-semibold text-suite-ink mb-1">
          {hasFilter ? "No masterplans for this project" : "No masterplans found"}
        </p>
        <p className="text-sm text-suite-ink-3 max-w-md mb-5">
          {canCreate
            ? hasFilter
              ? `Create a new masterplan estimate for "${projectName}"`
              : "Create your first masterplan estimate"
            : "No masterplans have been created yet"}
        </p>
        {canCreate && (
          <SuiteButton variant="dark" onClick={onCreate}>
            <Plus className="size-4" strokeWidth={2} />
            Create Masterplan
          </SuiteButton>
        )}
      </div>
    </div>
  );
}
