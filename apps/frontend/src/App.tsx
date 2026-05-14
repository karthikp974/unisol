import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import * as Pages from "./app-lazy-pages";
import { LoginPage } from "./auth/LoginPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { useAuth } from "./auth/auth-context";
import { getDefaultPortal } from "./auth/portal-redirect";
import { ErpLoader } from "./shared/ErpLoader";
import { LazyRouteBoundary } from "./shared/LazyRouteBoundary";
import { Shell } from "./shared/Shell";
import { useChunkLoadRecovery } from "./shared/useChunkLoadRecovery";

export function App() {
  const { user, isLoading } = useAuth();
  useChunkLoadRecovery();

  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute allowedTypes={["ADMIN"]} />}>
        <Route element={<LazyRouteBoundary />}>
          <Route path="department-branch" element={<Pages.DepartmentBranchHomePage />} />
          <Route path="department-branch/add-department" element={<Pages.AddDepartmentPage />} />
          <Route path="department-branch/add-branch" element={<Pages.AddBranchPage />} />
          <Route path="department-branch/modify-department" element={<Pages.ModifyDepartmentPage />} />
          <Route path="department-branch/modify-branch" element={<Pages.ModifyBranchPage />} />
          <Route path="department-branch/delete-department" element={<Pages.DeleteDepartmentPage />} />
          <Route path="department-branch/delete-branch" element={<Pages.DeleteBranchPage />} />
          <Route path="department-branch/history" element={<Pages.ModuleHistoryPage title="Department & Branch" entities={["Program", "Branch"]} />} />
          <Route path="classes-sections" element={<Pages.ClassesSectionsHomePage />} />
          <Route path="classes-sections/add-class" element={<Pages.AddClassPage />} />
          <Route path="classes-sections/add-section" element={<Pages.AddSectionPage />} />
          <Route path="classes-sections/modify-class" element={<Pages.ModifyClassPage />} />
          <Route path="classes-sections/modify-section" element={<Pages.ModifySectionPage />} />
          <Route path="classes-sections/delete-class" element={<Pages.DeleteClassPage />} />
          <Route path="classes-sections/delete-section" element={<Pages.DeleteSectionPage />} />
          <Route path="classes-sections/history" element={<Pages.ModuleHistoryPage title="Classes & Sections" entities={["AcademicClass", "Section"]} />} />
          <Route path="batches" element={<Pages.BatchesHomePage />} />
          <Route path="batches/add-batch" element={<Pages.AddBatchWorkflowPage />} />
          <Route path="batches/modify-batch" element={<Pages.ModifyBatchPage />} />
          <Route path="batches/delete-batch" element={<Pages.DeleteBatchPage />} />
          <Route path="batches/history" element={<Pages.ModuleHistoryPage title="Batches" entities={["Batch"]} />} />
          <Route path="subjects" element={<Pages.SubjectsHomePage />} />
          <Route path="subjects/add-subject" element={<Pages.AddSubjectPage />} />
          <Route path="subjects/modify-subject" element={<Pages.ModifySubjectPage />} />
          <Route path="subjects/delete-subject" element={<Pages.DeleteSubjectPage />} />
          <Route path="subjects/history" element={<Pages.ModuleHistoryPage title="Subjects" entities={["Subject"]} />} />
          <Route path="syllabus" element={<Pages.SyllabusHomePage />} />
          <Route path="syllabus/add-syllabus" element={<Pages.AddSyllabusPage />} />
          <Route path="syllabus/modify-syllabus" element={<Pages.ModifySyllabusPage />} />
          <Route path="syllabus/delete-syllabus" element={<Pages.DeleteSyllabusPage />} />
          <Route path="syllabus/history" element={<Pages.ModuleHistoryPage title="Syllabus" entities={["Syllabus"]} />} />
          <Route path="teachers" element={<Pages.TeachersHomePage />} />
          <Route path="teachers/add-teacher" element={<Pages.AddTeacherPage />} />
          <Route path="teachers/modify-teacher" element={<Pages.ModifyTeacherPage />} />
          <Route path="teachers/delete-teacher" element={<Pages.DeleteTeacherPage />} />
          <Route path="teachers/history" element={<Pages.ModuleHistoryPage title="Teachers" entities={["TeacherProfile"]} />} />
          <Route path="students" element={<Pages.StudentsHomePage />} />
          <Route path="students/add-student" element={<Pages.AddStudentPage />} />
          <Route path="students/modify-student" element={<Pages.ModifyStudentPage />} />
          <Route path="students/delete-student" element={<Pages.DeleteStudentPage />} />
          <Route path="students/history" element={<Pages.ModuleHistoryPage title="Students" entities={["StudentProfile"]} />} />
          <Route path="promotion" element={<Pages.PromotionHomePage />} />
          <Route path="promotion/history" element={<Pages.ModuleHistoryPage title="Promotion" entities={["StudentPromotionHistory"]} />} />
          <Route path="fee-structure" element={<Pages.FeeStructureHomePage />} />
          <Route path="fee-structure/history" element={<Pages.ModuleHistoryPage title="Fee Structure" entities={["FeeStructure"]} />} />
          <Route path="payments/register" element={<Pages.PaymentsRegisterPage />} />
          <Route path="payments/history" element={<Pages.PaymentsHistoryPage />} />
          <Route path="payments" element={<Pages.PaymentsHubPage />} />
          <Route path="announcements" element={<Pages.AnnouncementsHubPage />} />
          <Route path="announcements/create" element={<Pages.AnnouncementCreatePage />} />
          <Route path="announcements/history" element={<Pages.AnnouncementHistoryPage />} />
          <Route path="announcements/modify" element={<Pages.AnnouncementModifyListPage />} />
          <Route path="announcements/modify/:id" element={<Pages.AnnouncementModifyEditPage />} />
          <Route path="announcements/archive" element={<Pages.AnnouncementArchivePage />} />
          <Route path="feedback" element={<Pages.FeedbackHubPage />} />
          <Route path="feedback/create-feedback-form" element={<Pages.FeedbackCreateFormPage />} />
          <Route path="feedback/active-forms" element={<Pages.FeedbackActiveFormsPage />} />
          <Route path="feedback/archived-feedbacks" element={<Pages.FeedbackArchivedPage />} />
          <Route path="feedback/feedback-reports" element={<Pages.FeedbackReportsHubPage />} />
          <Route path="feedback/feedback-reports/:formId" element={<Pages.FeedbackReportDetailPage />} />
          <Route path="feedback/feedback-reports/:formId/questions/:questionId/paragraphs" element={<Pages.FeedbackParagraphAnswersPage />} />
        </Route>
      </Route>
      <Route element={isLoading ? <ErpLoader fullScreen /> : <Shell />}>
        <Route index element={<Navigate to={user ? getDefaultPortal(user.type) : "/login"} replace />} />
        <Route element={<ProtectedRoute allowedTypes={["ADMIN"]} />}>
          <Route element={<LazyRouteBoundary />}>
            <Route path="admin" element={<Pages.AdminDashboardPage />} />
            <Route path="admin/modules" element={<Pages.AdminPortal />} />
            <Route path="database" element={<Pages.DatabasePortal />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute allowedTypes={["ADMIN", "TEACHER"]} />}>
          <Route element={<LazyRouteBoundary />}>
            <Route path="teacher" element={<Pages.TeacherPortal />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute allowedTypes={["ADMIN", "STUDENT"]} />}>
          <Route element={<LazyRouteBoundary />}>
            <Route path="student" element={<Outlet />}>
              <Route index element={<Pages.StudentPortal />} />
              <Route path="feedback" element={<Pages.StudentFeedbackListPage />} />
              <Route path="feedback/:formId" element={<Pages.StudentFeedbackFillPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
