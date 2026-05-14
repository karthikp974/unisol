import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StudentAnnouncementsPanel } from "../announcements/AnnouncementsPanels";
import { StudentApplicationsPanel } from "../applications/ApplicationsPanels";
import { StudentAttendancePanel } from "../attendance/AttendancePanels";
import { useAuth } from "../auth/auth-context";
import { StudentFinancePanel } from "../finance/FinancePanels";
import { StudentResultsPanel } from "../results/ResultsPanels";
import { PageHeader } from "../shared/PageHeader";
import { PortalCard } from "../shared/PortalCard";
import { StudentTeamsPanel } from "../teams/TeamsPanels";
import { StudentTimetablePanel } from "../timetable/TimetablePanels";

const sections = [
  ["Attendance", "Personal attendance percentage, subject-wise summary, and recent history are active.", "Ready"],
  ["Fees", "Dues, paid amount, balance, and payment history are active.", "Ready"],
  ["Timetable", "Weekly class timetable is active.", "Ready"],
  ["Marks", "Semester-wise marks, failed-subject highlighting, credits, and PDF-imported results are active.", "Ready"],
  ["Applications", "Student applications and request tracking are active.", "Ready"],
  ["Announcements", "College notices and scoped class announcements are active.", "Ready"],
  ["Teams", "Personal team assignments are active.", "Ready"]
] as const;

type AcademicEnvironment = {
  student: { currentSectionId: string; rollNumber: string };
  section: { code: string | null; name: string; semester: number; class: string; batch: string; branch: string; department: string; campus: string };
  subjects: { id: string; code: string; name: string; syllabi: { id: string; units: { id: string; title: string; order: number }[] }[] }[];
  teachers: { role: string; name: string; subjectCode: string | null }[];
  timetable: { id: string }[];
  feeStructures: { id: string; name: string; amount: number; dueDate: string | null }[];
};

export function StudentPortal() {
  const { authFetch } = useAuth();
  const [academic, setAcademic] = useState<AcademicEnvironment | null>(null);

  useEffect(() => {
    let alive = true;
    void authFetch("/api/portals/student/academic")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load section academic environment");
        return (await response.json()) as AcademicEnvironment;
      })
      .then((data) => {
        if (alive) setAcademic(data);
      })
      .catch(() => {
        if (alive) setAcademic(null);
      });
    return () => {
      alive = false;
    };
  }, [authFetch]);

  return (
    <>
      <PageHeader
        eyebrow="Student portal"
        title="Simple student self-service"
        description="Students only see their own data. Attendance, fees, timetable, marks, applications, announcements, and teams are active."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(([title, description, status]) => (
          <PortalCard key={title} title={title} description={description}>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${status === "Ready" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>
              {status}
            </span>
          </PortalCard>
        ))}
      </div>
      {academic ? (
        <div className="mt-6">
          <PortalCard title="Current Section Academic Environment" description={`${academic.section.campus} / ${academic.section.department} / ${academic.section.branch}`}>
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div><strong>Section</strong><br />{academic.section.code ?? academic.section.name}</div>
              <div><strong>Semester</strong><br />{academic.section.semester}</div>
              <div><strong>Subjects</strong><br />{academic.subjects.length}</div>
              <div><strong>Teachers</strong><br />{academic.teachers.length}</div>
              <div><strong>Timetable Slots</strong><br />{academic.timetable.length}</div>
              <div><strong>Active Fees</strong><br />{academic.feeStructures.length}</div>
            </div>
          </PortalCard>
        </div>
      ) : null}
      <div className="mt-6">
        <StudentTimetablePanel />
      </div>
      <div className="mt-6">
        <StudentTeamsPanel />
      </div>
      <div className="mt-6">
        <StudentAnnouncementsPanel />
      </div>
      <div className="mt-6">
        <StudentApplicationsPanel />
      </div>
      <div className="mt-6">
        <StudentResultsPanel />
      </div>
      <div className="mt-6">
        <StudentFinancePanel />
      </div>
      <div className="mt-6">
        <PortalCard title="Structured feedback" description="Guest lecture, exam, workshop, and event feedback forms targeted to your section.">
          <Link to="/student/feedback" className="text-sm font-bold text-blue-700 underline">
            Open feedback forms
          </Link>
        </PortalCard>
      </div>
      <div className="mt-6">
        <StudentAttendancePanel />
      </div>
    </>
  );
}
