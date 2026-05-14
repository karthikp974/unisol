import { useSearchParams } from "react-router-dom";
import { AdminAnnouncementsPanel } from "../announcements/AnnouncementsPanels";
import { AdminApplicationsPanel } from "../applications/ApplicationsPanels";
import { AdminAttendancePanel } from "../attendance/AttendancePanels";
import { AdminFinancePanel } from "../finance/FinancePanels";
import { AdminReportsPanel } from "../reports/ReportsPanels";
import { AdminResultsPanel } from "../results/ResultsPanels";
import { PromotionPanel } from "../promotions/PromotionPanel";
import { PageHeader } from "../shared/PageHeader";
import { StudentManagement } from "../students/StudentManagement";
import { StructureManagement } from "../structure/StructureManagement";
import { TeacherManagement } from "../teachers/TeacherManagement";
import { AdminTeamsPanel } from "../teams/TeamsPanels";
import { AdminTimetablePanel } from "../timetable/TimetablePanels";

const adminModules = {
  announcements: {
    title: "Announcements",
    description: "Publish and archive notices for selected audiences.",
    panel: <AdminAnnouncementsPanel />
  },
  applications: {
    title: "Applications",
    description: "Review student requests and track status history.",
    panel: <AdminApplicationsPanel />
  },
  batches: {
    title: "Batches",
    description: "Manage academic batches inside the structure workspace.",
    panel: <StructureManagement initialTab="batches" visibleTabs={["batches"]} title="Batches" description="Manage academic batches only." />
  },
  attendance: {
    title: "Attendance",
    description: "Manage attendance, corrections, holidays, and exports.",
    panel: <AdminAttendancePanel />
  },
  finance: {
    title: "Finance",
    description: "Manage fee structures, payments, reversals, and exports.",
    panel: <AdminFinancePanel />
  },
  promotion: {
    title: "Promotion",
    description: "Move students between academic sections with history.",
    panel: <PromotionPanel />
  },
  reports: {
    title: "Reports",
    description: "Review attendance, finance, results, and application reports.",
    panel: <AdminReportsPanel />
  },
  classes: {
    title: "Classes",
    description: "Manage semester classes inside the structure workspace.",
    panel: <StructureManagement initialTab="classes" visibleTabs={["classes"]} title="Classes" description="Manage semester classes only." />
  },
  "department-branch": {
    title: "Department & Branch",
    description: "Manage campuses, programs, and branches inside the structure workspace.",
    panel: (
      <StructureManagement
        initialTab="campuses"
        visibleTabs={["campuses", "programs", "branches"]}
        title="Department & Branch"
        description="Manage campuses, programs, and branches only."
      />
    )
  },
  results: {
    title: "Results",
    description: "Manage manual results and PDF result imports.",
    panel: <AdminResultsPanel />
  },
  students: {
    title: "Students",
    description: "Create, update, search, deactivate, and reactivate student records.",
    panel: <StudentManagement />
  },
  sections: {
    title: "Sections",
    description: "Manage sections inside the structure workspace.",
    panel: <StructureManagement initialTab="sections" visibleTabs={["sections"]} title="Sections" description="Manage sections only." />
  },
  structure: {
    title: "Structure",
    description: "Manage campuses, programs, branches, batches, classes, sections, and subjects.",
    panel: <StructureManagement />
  },
  subjects: {
    title: "Subjects",
    description: "Manage subjects inside the structure workspace.",
    panel: <StructureManagement initialTab="subjects" visibleTabs={["subjects"]} title="Subjects" description="Manage subjects only." />
  },
  syllabus: {
    title: "Syllabus",
    description: "Manage syllabus-related subjects inside the structure workspace.",
    panel: <StructureManagement initialTab="subjects" visibleTabs={["subjects"]} title="Syllabus" description="Manage syllabus-related subjects only." />
  },
  teachers: {
    title: "Teachers",
    description: "Manage teacher identities, role assignments, scopes, and access.",
    panel: <TeacherManagement />
  },
  teams: {
    title: "Teams",
    description: "Create and archive student teams inside sections.",
    panel: <AdminTeamsPanel />
  },
  timetable: {
    title: "Timetable",
    description: "Manage class and teacher timetable entries.",
    panel: <AdminTimetablePanel />
  }
} as const;

type AdminModuleKey = keyof typeof adminModules;

function isAdminModuleKey(value: string | null): value is AdminModuleKey {
  return value !== null && value in adminModules;
}

export function AdminPortal() {
  const [searchParams] = useSearchParams();
  const moduleKey = searchParams.get("module");
  const selectedModule = isAdminModuleKey(moduleKey) ? adminModules[moduleKey] : null;

  if (selectedModule) {
    return (
      <>
        <PageHeader eyebrow="Admin modules" title={selectedModule.title} description={selectedModule.description} />
        <div className="mt-6">
          {selectedModule.panel}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Admin modules" title="Management workspaces" description="Use these panels for structure, users, attendance, finance, timetable, results, teams, reports, announcements, and promotions." />
      <div className="mt-6">
        <AdminTimetablePanel />
      </div>
      <div className="mt-6">
        <AdminTeamsPanel />
      </div>
      <div className="mt-6">
        <PromotionPanel />
      </div>
      <div className="mt-6">
        <AdminReportsPanel />
      </div>
      <div className="mt-6">
        <AdminAnnouncementsPanel />
      </div>
      <div className="mt-6">
        <AdminApplicationsPanel />
      </div>
      <div className="mt-6">
        <AdminResultsPanel />
      </div>
      <div className="mt-6">
        <AdminFinancePanel />
      </div>
      <div className="mt-6">
        <AdminAttendancePanel />
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
