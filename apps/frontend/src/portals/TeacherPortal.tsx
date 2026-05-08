import { PageHeader } from "../shared/PageHeader";
import { PortalCard } from "../shared/PortalCard";
import { SafeActionButton } from "../shared/SafeActionButton";
import { useToast } from "../shared/toast-context";

const roleCards = [
  {
    role: "STPO",
    title: "Subject Teacher Workspace",
    description: "Assigned subjects, syllabus progress, timetable, and student visibility."
  },
  {
    role: "CTPO",
    title: "Class Teacher Workspace",
    description: "Assigned section, attendance view/mark, teams, students, and fee marking when permitted."
  },
  {
    role: "HTPO",
    title: "Head Scope Workspace",
    description: "Admin-assigned class/section/branch scope for timetable, attendance, fee marking, teams, and result upload."
  }
];

export function TeacherPortal() {
  const { showToast } = useToast();

  return (
    <>
      <PageHeader
        eyebrow="Teacher portal"
        title="Adaptive multi-role dashboard"
        description="One teacher account can hold STPO, CTPO, and HTPO responsibilities at the same time. Backend permissions decide which cards and actions are actually allowed."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {roleCards.map((card) => (
          <PortalCard key={card.role} title={card.title} description={card.description}>
            <div className="mb-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {card.role}
            </div>
            <SafeActionButton run={() => showToast(`${card.role} workspace checked`)}>
              Open workspace
            </SafeActionButton>
          </PortalCard>
        ))}
      </div>
    </>
  );
}
