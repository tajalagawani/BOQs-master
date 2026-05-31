"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Fragment,
  useState,
  useTransition,
  type ReactNode,
} from "react"
import {
  LayoutGrid,
  Bell,
  Search,
  User,
  Info,
  ChevronDown,
  Home,
  Settings,
  Globe,
  Briefcase,
  Folder,
  Users,
  Calendar,
  UserPlus,
  X,
  Check,
  FileSpreadsheet,
} from "lucide-react"
import { Label, ListBox, Select } from "@heroui/react"

import type { Project } from "@/modules/procurex/projects"
import { updateProject } from "@/modules/procurex/projects/actions"

import { Step1Toc } from "./step1-toc"
import { Step2TenderDocuments } from "./step-2-tender-documents"
import { Step3Tenderer } from "./step-3-tenderer"
import {
  Step4Configure,
  STEP_4_SUB_STEP_COUNT,
  type Step4ReportTab,
} from "./step-4-configure"
import { Step5ResultsOverview } from "./step-5-results-overview"
import { Step6Reports } from "./step-6-reports"

const STEPS = [
  "Project Information",
  "Tender Documents & PTE",
  "Tenderer Upload",
  "Configure",
  "Results Overview",
  "Reports",
]

function GlobalNav({ projectId }: { projectId?: string }) {
  return (
    <div className="flex gap-[24px] h-[80px] items-start w-full">
      <div className="flex flex-col items-start w-[96px]">
        <div className="bg-white flex flex-col gap-[16px] items-center p-[16px] rounded-br-[8px] w-[96px]">
          <div className="flex flex-col items-center justify-center px-[16px] py-[8px] rounded-[8px] w-[48px]">
            <div className="flex flex-col items-center justify-center rounded-[8px] size-[32px]">
              <LayoutGrid className="size-[16px] text-black" />
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="flex gap-[16px] items-center pb-[8px]">
              <p
                className="font-medium text-[#142845] text-[16px] tracking-[-1.12px] leading-[21px]"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                ProcureX
              </p>
            </div>
            <div className="flex flex-col gap-[16px] items-start">
              <div className="bg-white flex flex-col items-center justify-center rounded-[5.333px] size-[32px]">
                <Home className="size-[16px] text-[#142845]" />
              </div>
              <div className="bg-[#e2edf7] flex flex-col items-center justify-center rounded-[5.333px] size-[32px]">
                <Settings className="size-[16px] text-[#142845]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col h-full items-start justify-end px-[24px]">
        <div className="bg-[#e2edf7] flex h-[24px] items-center justify-center px-[8px] rounded-[8px] gap-[8px]">
          <div className="flex gap-[4px] items-center w-[139px]">
            <User className="size-[16px] text-black" />
            <p className="font-normal text-[12px] text-black leading-[16px]">
              QS Workspace View
            </p>
          </div>
          <Info className="size-[16px] text-black" />
          <ChevronDown className="size-[16px] text-black" />
        </div>
      </div>

      <div className="grid flex-1 grid-cols-3 items-center px-[24px] py-[16px]">
        <div />
        <div className="flex justify-center">
          <div className="bg-white border border-[#e9e9e9] flex h-[48px] items-center justify-between px-[16px] rounded-[16px] w-[400px]">
            <p className="italic text-[#555] text-[14px] leading-[24px]">
              Search for anything tender related
            </p>
            <Search className="size-[16px] text-[#555]" />
          </div>
        </div>

        <div className="flex gap-[8px] items-center justify-end">
          {projectId ? (
            <Link
              href={`/procurex/projects/${projectId}/boq`}
              className="bg-white flex flex-col items-center justify-center rounded-[8px] size-[40px] hover:bg-[#f3f4f5]"
              title="View imported BoQ"
            >
              <FileSpreadsheet className="size-[16px] text-black" />
            </Link>
          ) : null}
          <div className="bg-white flex flex-col items-center justify-center rounded-[8px] size-[40px] relative">
            <Bell className="size-[16px] text-black" />
            <div className="absolute bg-[#f8ccd7] flex h-[12px] items-center justify-center left-[22px] px-[6px] rounded-[12px] top-[2px]">
              <p className="font-semibold text-[8px] text-black leading-[8px]">1</p>
            </div>
          </div>

          <div className="bg-white relative rounded-[8px] size-[40px]">
            <div className="absolute inset-[10%] flex items-center justify-center">
              <div className="rounded-full size-[32px] bg-gradient-to-br from-[#e2edf7] to-[#c9d8ea] flex items-center justify-center">
                <p className="font-normal text-[#142845] text-[12px] leading-[16px]">
                  DM
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white flex flex-col items-center justify-center rounded-[8px] size-[40px]">
            <Globe className="size-[19.2px] text-black" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StepperBar({
  current,
  onChange,
}: {
  current: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex h-[128px] items-center px-[48px] py-[24px] w-full gap-[24px]">
      <div className="flex flex-col gap-[8px] items-start w-[144px] shrink-0">
        <h1 className="font-semibold text-[#141414] text-[16px] leading-[24px]">
          Tender Setup
        </h1>
        <p className="italic font-normal text-[#343434] text-[12px] leading-[18px] opacity-90">
          Define project context &amp; tender parameters
        </p>
      </div>
      <div className="flex flex-1 items-start px-[40px]">
        {STEPS.map((label, idx) => {
          const n = idx + 1
          const active = n === current
          const done = n < current
          return (
            <Fragment key={label}>
              <button
                type="button"
                onClick={() => onChange(n)}
                className="flex flex-col items-center gap-[8px] shrink-0 cursor-pointer focus:outline-none group"
              >
                <div
                  className={`size-[24px] rounded-full flex items-center justify-center border transition-colors ${
                    active
                      ? "bg-[#142845] border-[#142845]"
                      : done
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-white border-[#d9d9d9] group-hover:border-[#142845]"
                  }`}
                >
                  {done ? (
                    <Check className="size-[14px] text-white" strokeWidth={3} />
                  ) : (
                    <span
                      className={`font-medium text-[14px] leading-[21px] ${
                        active ? "text-white" : "text-[#142845]"
                      }`}
                      style={{ fontFamily: "Roboto, sans-serif" }}
                    >
                      {n}
                    </span>
                  )}
                </div>
                <p
                  className={`text-[#142845] text-[12px] text-center whitespace-nowrap ${
                    active
                      ? "font-medium leading-[16px]"
                      : "font-normal leading-[18px]"
                  }`}
                >
                  {label}
                </p>
              </button>
              {idx < STEPS.length - 1 && (
                <div
                  className={`h-[2px] rounded-[16px] flex-1 min-w-[24px] mt-[11px] mx-[12px] ${
                    done ? "bg-emerald-500" : "bg-[#d9d9d9]"
                  }`}
                />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

interface FormInputProps {
  label: string
  placeholder: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  type?: string
}

function FormInput({
  label,
  placeholder,
  required,
  value,
  onChange,
  type = "text",
}: FormInputProps) {
  const filled = value !== ""
  return (
    <div className="flex flex-col gap-[8px] h-[56px] items-start justify-end relative w-full">
      <div className="bg-white border border-[#d9d9d9] flex gap-[8px] h-[48px] items-center justify-between px-[16px] rounded-[16px] w-full">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 bg-transparent text-[14px] leading-[24px] focus:outline-none placeholder:italic placeholder:text-[#555] ${
            filled ? "not-italic text-[#262626]" : "italic text-[#555]"
          }`}
          style={{ fontFamily: "Inter, sans-serif" }}
        />
        {filled && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex flex-col items-center justify-center rounded-[8px] size-[32px] hover:bg-gray-50"
            aria-label={`Clear ${label}`}
          >
            <X className="size-[16px] text-[#555]" />
          </button>
        )}
      </div>
      <div className="absolute bg-white flex items-center justify-center left-[16px] px-[4px] rounded-[4px] top-0">
        <p
          className="font-normal text-[#434343] text-[12px] leading-[16px] whitespace-nowrap"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {required && <span className="text-[#c32a4f]">*</span>}
          {required ? " " : ""}
          {label}
        </p>
      </div>
    </div>
  )
}

interface FormDropdownProps {
  label: string
  placeholder: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  options: string[]
}

function FormDropdown({
  label,
  placeholder,
  required,
  value,
  onChange,
  options,
}: FormDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const filled = value !== ""
  return (
    <div className="flex flex-col h-[56px] items-center justify-end relative w-full">
      <Select
        fullWidth
        variant={isOpen ? "primary" : "secondary"}
        isRequired={required}
        placeholder={placeholder}
        value={value || null}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        onChange={(v) => onChange((v as string) ?? "")}
        className="relative w-full"
      >
        <Select.Trigger
          className={
            isOpen
              ? undefined
              : `bg-white border flex h-[48px] items-center justify-between px-[16px] rounded-[16px] w-full shadow-none ${
                  filled ? "border-[#d9d9d9]" : "border-[#e3e3e3]"
                }`
          }
        >
          <Select.Value
            className={
              isOpen
                ? undefined
                : `font-normal text-[14px] leading-[24px] whitespace-nowrap font-[Inter,sans-serif] ${
                    filled ? "not-italic text-black" : "italic text-[#555]"
                  }`
            }
          />
          {isOpen ? (
            <Select.Indicator />
          ) : (
            <Select.Indicator className="size-[16px] text-[#555]">
              <ChevronDown className="size-[16px] text-[#555]" />
            </Select.Indicator>
          )}
        </Select.Trigger>
        <Label
          className={
            isOpen
              ? undefined
              : "absolute bg-white flex items-start left-[16px] px-[8px] top-[-8px] z-10 pointer-events-none font-normal text-[#434343] text-[12px] leading-[16px] whitespace-nowrap font-[Inter,sans-serif]"
          }
        >
          {required && <span className="text-[#c32a4f]">* </span>}
          {label}
        </Label>
        <Select.Popover>
          <ListBox>
            {options.map((o) => (
              <ListBox.Item key={o} id={o} textValue={o}>
                {o}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  )
}

interface FormDateProps {
  label: string
  value: string
  onChange: (v: string) => void
}

function FormDate({ label, value, onChange }: FormDateProps) {
  const filled = value !== ""
  return (
    <div className="flex flex-col gap-[8px] h-[56px] items-start justify-end relative w-[280px]">
      <div
        className={`bg-white border flex gap-[8px] h-[48px] items-center px-[16px] rounded-[16px] w-[280px] ${
          filled ? "border-[#9d9d9d]" : "border-[#d9d9d9]"
        }`}
      >
        <Calendar className="size-[16px] text-[#555]" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Not issued"
          className={`flex-1 bg-transparent text-[14px] leading-[24px] focus:outline-none placeholder:italic placeholder:text-[#555] ${
            filled ? "not-italic text-black" : "italic text-[#555]"
          }`}
          style={{ fontFamily: "Inter, sans-serif" }}
        />
      </div>
      <div className="absolute bg-white flex items-center left-[16px] px-[8px] top-0">
        <p
          className="font-normal text-[#434343] text-[12px] leading-[16px] whitespace-nowrap"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {label}
        </p>
      </div>
    </div>
  )
}

interface SectionProps {
  id?: string
  icon: ReactNode
  title: string
  subtitle: ReactNode
  children: ReactNode
  borderBottom?: boolean
  rightSlot?: ReactNode
}

function Section({ id, icon, title, subtitle, children, rightSlot }: SectionProps) {
  return (
    <div
      id={id}
      className="bg-white flex items-end justify-between p-[40px] rounded-[16px] w-full scroll-mt-[120px]"
    >
      <div className="flex flex-1 items-center min-w-0">
        <div className="flex items-center w-full">
          <div className="flex flex-col gap-[8px] items-start px-[80px] w-[400px]">
            <div className="flex gap-[8px] items-center">
              {icon}
              <h2 className="font-semibold text-black text-[18px] leading-[24px] whitespace-nowrap">
                {title}
              </h2>
            </div>
            <p className="font-normal text-[#656565] text-[12px] leading-[16px]">
              {subtitle}
            </p>
          </div>
          <div className="flex items-center flex-1">
            <div className="flex flex-col gap-[40px] items-start justify-center w-[320px]">
              {children}
            </div>
            {rightSlot}
          </div>
        </div>
      </div>
    </div>
  )
}

interface TenderSetupProps {
  project?: Project
  initialStep?: number
}

export function TenderSetup({ project, initialStep = 1 }: TenderSetupProps = {}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [projectName, setProjectName] = useState(
    project?.name && project.name !== "Untitled tender" ? project.name : "",
  )
  const [currency, setCurrency] = useState(project?.currency ?? "")
  const [city, setCity] = useState(project?.city ?? "")
  const [country, setCountry] = useState(project?.country ?? "")
  const [projectType, setProjectType] = useState(project?.projectType ?? "")

  const [basisOfTender, setBasisOfTender] = useState(
    project?.basisOfTender ?? "",
  )
  const [conditions, setConditions] = useState(
    project?.conditionsOfContract ?? "",
  )
  const [gfa, setGfa] = useState(project?.gfa ?? "")
  const [bua, setBua] = useState(project?.bua ?? "")
  const [budget, setBudget] = useState("")

  const [projectLead, setProjectLead] = useState("")
  const [procurementLead, setProcurementLead] = useState("")
  const [tenderCoordinator, setTenderCoordinator] = useState("")

  const [tenderIssued, setTenderIssued] = useState(
    project?.tenderIssuedAt ?? "",
  )
  const [originalReturn, setOriginalReturn] = useState(
    project?.originalReturnAt ?? "",
  )
  const [adjustedReturn, setAdjustedReturn] = useState(
    project?.adjustedReturnAt ?? "",
  )

  const [step, setStep] = useState(initialStep)
  const [step3TendererCount, setStep3TendererCount] = useState(0)
  const [step4SubStep, setStep4SubStep] = useState(1)
  const [step4ReportTab, setStep4ReportTab] = useState<Step4ReportTab>("ptc")

  const canContinue =
    projectName.trim() !== "" && currency !== "" && projectLead.trim() !== ""

  function goToStep(nextStep: number) {
    if (!project) {
      setStep(nextStep)
      return
    }
    const persistStep1 = step === 1
    startTransition(async () => {
      if (persistStep1) {
        await updateProject(project.id, {
          name: projectName.trim() || "Untitled tender",
          currency: currency || null,
          city: city || null,
          country: country || null,
          projectType: projectType || null,
          basisOfTender: basisOfTender || null,
          conditionsOfContract: conditions || null,
          gfa: gfa || null,
          bua: bua || null,
          tenderIssuedAt: tenderIssued || null,
          originalReturnAt: originalReturn || null,
          adjustedReturnAt: adjustedReturn || null,
        })
      }
      setStep(nextStep)
      router.replace(`/procurex/projects/${project.id}/setup?step=${nextStep}`)
    })
  }


  return (
    <div className="bg-[#f8f8f8] min-h-screen relative pb-[120px]">
      <div className="w-full sticky top-0 z-50 bg-[#f8f8f8]">
        <GlobalNav projectId={project?.id} />
      </div>

      <div className="w-[1360px] mx-auto">
        <StepperBar current={step} onChange={goToStep} />
      </div>

      {step === 2 && (
        <Step2TenderDocuments
          workspaceId={project?.workspaceId ?? ""}
          projectId={project?.id ?? ""}
          roundId={project ? `${project.id}::initial` : ""}
        />
      )}

      {step === 3 && (
        <Step3Tenderer
          workspaceId={project?.workspaceId ?? ""}
          projectId={project?.id ?? ""}
          count={step3TendererCount}
          onCountChange={setStep3TendererCount}
        />
      )}

      {step === 4 && (
        <Step4Configure
          projectId={project?.id ?? ""}
          subStep={step4SubStep}
          onSubStepChange={setStep4SubStep}
          reportTab={step4ReportTab}
          onReportTabChange={setStep4ReportTab}
        />
      )}

      {step === 5 && <Step5ResultsOverview />}

      {step === 6 && (
        <Step6Reports
          projectId={project?.id ?? ""}
          projectName={
            project?.name && project.name !== "Untitled tender"
              ? project.name
              : projectName.trim() || null
          }
        />
      )}

      {step === 1 && <Step1Toc />}

      {step === 1 && (
      <div className="flex flex-col gap-[16px] items-start w-[1360px] mx-auto">
        {/* Project Identity */}
        <Section
          id="step1-identity"
          icon={<Briefcase className="size-[24px] text-black" />}
          title="Project Identity"
          subtitle="Please provide basic project information."
        >
          <FormInput
            label="Project Name"
            required
            placeholder="Enter project name"
            value={projectName}
            onChange={setProjectName}
          />
          <FormDropdown
            label="Currency"
            required
            placeholder="Select currency"
            value={currency}
            onChange={setCurrency}
            options={["AED", "USD", "EUR", "GBP", "SAR"]}
          />
          <FormDropdown
            label="City"
            placeholder="Select city"
            value={city}
            onChange={setCity}
            options={["Dubai", "Abu Dhabi", "Riyadh", "Doha", "London"]}
          />
          <FormDropdown
            label="Country"
            placeholder="Select country"
            value={country}
            onChange={setCountry}
            options={[
              "United Arab Emirates",
              "Saudi Arabia",
              "Qatar",
              "United Kingdom",
              "United States",
            ]}
          />
          <FormDropdown
            label="Project type"
            placeholder="Select project type"
            value={projectType}
            onChange={setProjectType}
            options={[
              "Infrastructure",
              "Hospitality",
              "Residential",
              "Commercial",
              "Industrial",
            ]}
          />
        </Section>

        {/* Contract Details */}
        <Section
          id="step1-contract"
          icon={<Folder className="size-[24px] text-black" />}
          title="Contract Details"
          subtitle="Procurement and contract configuration."
        >
          <FormDropdown
            label="Basis of Tender"
            placeholder="Select basis of tender"
            value={basisOfTender}
            onChange={setBasisOfTender}
            options={["Lump Sum", "Re-measurement", "Cost Plus", "Target Cost"]}
          />
          <FormInput
            label="Conditions of Contract"
            placeholder="E.g. FIDIC Red Book"
            value={conditions}
            onChange={setConditions}
          />
          <FormInput
            label="GFA m²"
            placeholder="Enter ground floor area"
            value={gfa}
            onChange={setGfa}
          />
          <FormInput
            label="BUA m²"
            placeholder="Enter built up area"
            value={bua}
            onChange={setBua}
          />
          <FormInput
            label="Budget"
            placeholder="Enter project budget"
            value={budget}
            onChange={setBudget}
          />
        </Section>

        {/* People */}
        <Section
          id="step1-people"
          icon={<Users className="size-[24px] text-black" />}
          title="People"
          subtitle={
            <>
              Assign the necessary people to this project,{" "}
              <span className="font-semibold">not the tenderers.</span>
            </>
          }
          rightSlot={
            <div className="ml-[32px] flex items-center justify-center">
              <button
                type="button"
                className="border border-[#142845] flex gap-[8px] h-[32px] items-center justify-center px-[16px] py-[8px] rounded-[16px]"
              >
                <UserPlus className="size-[16px] text-[#142845]" />
                <span className="font-normal text-[#142845] text-[12px] leading-[16px] whitespace-nowrap">
                  Add more
                </span>
              </button>
            </div>
          }
        >
          <FormInput
            label="Project Lead email"
            required
            placeholder="Enter project lead email"
            type="email"
            value={projectLead}
            onChange={setProjectLead}
          />
          <FormInput
            label="Procurement Lead email"
            placeholder="Enter procurement lead email"
            type="email"
            value={procurementLead}
            onChange={setProcurementLead}
          />
          <FormInput
            label="Tender Coordinator email"
            placeholder="Enter tender coordinator email"
            type="email"
            value={tenderCoordinator}
            onChange={setTenderCoordinator}
          />
        </Section>

        {/* Timeline */}
        <Section
          id="step1-timeline"
          icon={<Calendar className="size-[24px] text-black" />}
          title="Timeline"
          subtitle="Key project dates."
        >
          <div className="flex flex-col gap-[32px] items-start justify-center">
            <FormDate
              label="Tender issued"
              value={tenderIssued}
              onChange={setTenderIssued}
            />
            <FormDate
              label="Original tender return date"
              value={originalReturn}
              onChange={setOriginalReturn}
            />
            <FormDate
              label="Adjusted tender return date"
              value={adjustedReturn}
              onChange={setAdjustedReturn}
            />
          </div>
        </Section>
      </div>
      )}

      {/* Floating CTAs — suppressed on step 5 (actions live in sidebar) */}
      {step !== 5 && (
      <div className="flex gap-[16px] items-center justify-end w-[1360px] mx-auto mt-[24px]">
        <Link
          href="/"
          className="border border-[#142845] flex gap-[8px] h-[48px] items-center justify-center px-[24px] py-[8px] rounded-[16px] w-[120px] font-normal text-[#142845] text-[14px] leading-[24px] whitespace-nowrap"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Cancel setup
        </Link>
        {(step > 1 || (step === 4 && step4SubStep > 1)) && (
          <button
            type="button"
            onClick={() => {
              if (step === 4 && step4SubStep > 1) {
                setStep4SubStep((s) => Math.max(1, s - 1))
              } else {
                setStep((s) => Math.max(1, s - 1))
                setStep4SubStep(1)
              }
            }}
            className="border border-[#142845] flex gap-[8px] h-[48px] items-center justify-center px-[24px] py-[8px] rounded-[16px] w-[120px] font-normal text-[#142845] text-[14px] leading-[24px] whitespace-nowrap"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Previous
          </button>
        )}
        {(() => {
          const blocked =
            (step === 1 && !canContinue) ||
            (step === 3 && step3TendererCount === 0)
          const onStep4 = step === 4
          const onFinalSubStep = onStep4 && step4SubStep === STEP_4_SUB_STEP_COUNT
          const label = onFinalSubStep
            ? "Analyse"
            : onStep4
              ? "Next"
              : isPending
                ? "Saving…"
                : "Save and continue"
          const handleClick = () => {
            if (onStep4 && step4SubStep < STEP_4_SUB_STEP_COUNT) {
              setStep4SubStep((s) => s + 1)
            } else {
              const next = Math.min(STEPS.length, step + 1)
              setStep4SubStep(1)
              goToStep(next)
            }
          }
          const widthCls = onFinalSubStep
            ? "w-[140px]"
            : onStep4
              ? "w-[120px]"
              : "w-[168px]"
          const disabled = blocked || isPending
          return (
            <button
              type="button"
              disabled={disabled}
              onClick={handleClick}
              className={`flex gap-[8px] h-[48px] items-center justify-center px-[24px] py-[8px] rounded-[16px] font-normal text-[14px] leading-[24px] text-white whitespace-nowrap transition-colors ${widthCls} ${
                disabled
                  ? "bg-[#c4c4c4] cursor-not-allowed"
                  : "bg-[#142845] hover:bg-[#0e1d34] cursor-pointer"
              }`}
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {label}
            </button>
          )
        })()}
      </div>
      )}
    </div>
  )
}
