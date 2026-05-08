import { PageHeader } from "../shared/PageHeader";
import { PortalCard } from "../shared/PortalCard";
import { SafeActionButton } from "../shared/SafeActionButton";
import { useToast } from "../shared/toast-context";

const sections = [
  ["Attendance", "Student-only attendance view with filters and charts later."],
  ["Fees", "Fee structure, dues, payment history, and payments later."],
  ["Applications", "Exam applications and history later."],
  ["Marks", "Semester-wise results with failed subject highlighting later."]
];

export function StudentPortal() {
  const { showToast } = useToast();

  return (
    <>
      <PageHeader
        eyebrow="Student portal"
        title="Simple student self-service"
        description="Students should only see their own data. The shell is ready for attendance, fees, applications, and marks modules later."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(([title, description]) => (
          <PortalCard key={title} title={title} description={description}>
            <SafeActionButton run={() => showToast(`${title} action acknowledged`)}>
              Preview section
            </SafeActionButton>
          </PortalCard>
        ))}
      </div>
    </>
  );
}
