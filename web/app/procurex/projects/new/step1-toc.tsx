"use client"

import { FloatingToc } from "@heroui-pro/react"
import { useEffect, useState } from "react"

const SECTIONS = [
  { id: "step1-identity", label: "Project Identity" },
  { id: "step1-contract", label: "Contract Details" },
  { id: "step1-people", label: "People" },
  { id: "step1-timeline", label: "Timeline" },
] as const

type SectionId = (typeof SECTIONS)[number]["id"]

export function Step1Toc() {
  const [activeId, setActiveId] = useState<SectionId>(SECTIONS[0].id)

  useEffect(() => {
    const elements = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    )
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveId(visible.target.id as SectionId)
      },
      {
        rootMargin: "-25% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    )

    for (const el of elements) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function scrollToSection(id: SectionId) {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "start" })
    setActiveId(id)
  }

  return (
    <div className="fixed left-[44px] top-1/2 -translate-y-1/2 z-[60]">
      <FloatingToc placement="left">
        <FloatingToc.Trigger aria-label="Step 1 sections">
          {SECTIONS.map((s) => (
            <FloatingToc.Bar key={s.id} active={s.id === activeId} />
          ))}
        </FloatingToc.Trigger>
        <FloatingToc.Content>
          <span className="text-muted mb-1 block px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">
            Project information
          </span>
          {SECTIONS.map((s) => (
            <FloatingToc.Item
              key={s.id}
              active={s.id === activeId}
              onClick={() => scrollToSection(s.id)}
            >
              {s.label}
            </FloatingToc.Item>
          ))}
        </FloatingToc.Content>
      </FloatingToc>
    </div>
  )
}
