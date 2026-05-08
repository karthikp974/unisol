import { PageHeader } from "../shared/PageHeader";
import { PortalCard } from "../shared/PortalCard";
import { SafeActionButton } from "../shared/SafeActionButton";
import { StudentManagement } from "../students/StudentManagement";
import { StructureManagement } from "../structure/StructureManagement";
import { TeacherManagement } from "../teachers/TeacherManagement";
import { useToast } from "../shared/toast-context";

const sections = ["Dashboard", "Reports", "Subjects", "Syllabus", "Teachers", "Students", "Promotion"];

export function AdminPortal() {
  const { showToast } = useToast();

  return (
    <>
      <PageHeader
        eyebrow="Admin portal"
        title="Chairman control center"
        description="Foundation shell for full ERP control. Heavy modules are intentionally not built yet; this confirms navigation, structure access, and safe action behavior."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <PortalCard key={section} title={section} description="Placeholder for module-by-module development.">
            <SafeActionButton run={() => showToast(`${section} action acknowledged`)}>
              Test safe action
            </SafeActionButton>
          </PortalCard>
        ))}
      </div>
      <div className="mt-6">
        <TeacherManagement />
      </div>
      <div className="mt-6">
        <StudentManagement />
      </div>
      <div className="mt-6">
        <StructureManagement />
      </div>
    </>
  );
}
