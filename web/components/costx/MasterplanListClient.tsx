"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

import MasterplanTable from "@/components/costx/MasterplanTable";
import MasterplanSidebar, {
  type FilterType,
} from "@/components/costx/MasterplanSidebar";
import CreateMasterplanModal from "@/components/costx/CreateMasterplanModal";
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
import { cn } from "@/lib/cn";

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
}

/* ----------------------------------------------------------------------------
 * Client component
 * -------------------------------------------------------------------------- */
export default function MasterplanListClient({
  initialMasterplans,
  users = [],
  projects = [],
  permissions,
  currentUserEmail,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectFilter = searchParams.get("project");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
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
    return f;
  }, [initialMasterplans, projectFilter, filter, currentUserEmail]);

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

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <MasterplanSidebar
        filter={filter}
        onFilterChange={setFilter}
        canCreateMasterplan={permissions.canCreateMasterplan}
        onStartCreate={() => setIsModalOpen(true)}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Page header */}
        <header className="px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
                  All masterplans
                </h1>
                <p className="text-xs text-zinc-500">
                  Total: {filteredMasterplans.length} masterplan
                  {filteredMasterplans.length === 1 ? "" : "s"}
                </p>
              </div>
              {filteredProject && (
                <div className="flex items-center gap-1.5 pl-3 pr-1 py-1 bg-zinc-100 text-zinc-800 text-xs rounded-full">
                  <span>Project: {filteredProject.name}</span>
                  <button
                    type="button"
                    onClick={clearProjectFilter}
                    className="size-5 inline-flex items-center justify-center rounded-full hover:bg-zinc-200"
                    title="Clear filter"
                  >
                    <X className="size-3" strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>
            {permissions.canCreateMasterplan && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="h-10 px-4 inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium rounded-full"
              >
                <Plus className="size-4" strokeWidth={2} />
                Create Masterplan
              </button>
            )}
          </div>
        </header>

        {/* Table container */}
        <div className="flex-1 min-h-0 px-5 pb-5">
          <div className="h-full flex flex-col bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            {estimates.length === 0 ? (
              <EmptyState
                hasFilter={!!filteredProject}
                projectName={filteredProject?.name}
                canCreate={permissions.canCreateMasterplan}
                onCreate={() => setIsModalOpen(true)}
              />
            ) : (
              <>
                <div className="flex-1 overflow-auto">
                  <MasterplanTable
                    estimates={pagedEstimates}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    canEdit={permissions.canCreateMasterplan}
                    canDelete={permissions.isAdmin}
                  />
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalRecords={estimates.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </div>
        </div>
      </main>

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
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="size-14 rounded-2xl bg-zinc-100 inline-flex items-center justify-center mb-4">
        <svg
          className="size-6 text-zinc-400"
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
      <p className="text-base font-semibold text-zinc-900 mb-1">
        {hasFilter ? "No masterplans for this project" : "No masterplans found"}
      </p>
      <p className="text-sm text-zinc-500 max-w-md mb-5">
        {canCreate
          ? hasFilter
            ? `Create a new masterplan estimate for "${projectName}"`
            : "Create your first masterplan estimate"
          : "No masterplans have been created yet"}
      </p>
      {canCreate && (
        <button
          type="button"
          onClick={onCreate}
          className={cn(
            "h-10 px-4 inline-flex items-center gap-2",
            "bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium rounded-full",
          )}
        >
          <Plus className="size-4" strokeWidth={2} />
          Create Masterplan
        </button>
      )}
    </div>
  );
}
