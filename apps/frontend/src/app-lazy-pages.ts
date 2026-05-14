import { lazy } from "react";

/** Route-level lazy imports keep the main bundle small (Vite code-splitting). */
export const DepartmentBranchHomePage = lazy(() =>
  import("./department-branch/DepartmentBranchPages").then((m) => ({ default: m.DepartmentBranchHomePage }))
);
export const AddDepartmentPage = lazy(() => import("./department-branch/DepartmentBranchPages").then((m) => ({ default: m.AddDepartmentPage })));
export const AddBranchPage = lazy(() => import("./department-branch/DepartmentBranchPages").then((m) => ({ default: m.AddBranchPage })));
export const ModifyDepartmentPage = lazy(() => import("./department-branch/DepartmentBranchPages").then((m) => ({ default: m.ModifyDepartmentPage })));
export const ModifyBranchPage = lazy(() => import("./department-branch/DepartmentBranchPages").then((m) => ({ default: m.ModifyBranchPage })));
export const DeleteDepartmentPage = lazy(() => import("./department-branch/DepartmentBranchPages").then((m) => ({ default: m.DeleteDepartmentPage })));
export const DeleteBranchPage = lazy(() => import("./department-branch/DepartmentBranchPages").then((m) => ({ default: m.DeleteBranchPage })));

export const ClassesSectionsHomePage = lazy(() => import("./classes-sections/ClassesSectionsPages").then((m) => ({ default: m.ClassesSectionsHomePage })));
export const AddClassPage = lazy(() => import("./classes-sections/ClassesSectionsPages").then((m) => ({ default: m.AddClassPage })));
export const AddSectionPage = lazy(() => import("./classes-sections/ClassesSectionsPages").then((m) => ({ default: m.AddSectionPage })));
export const ModifyClassPage = lazy(() => import("./classes-sections/ClassesSectionsPages").then((m) => ({ default: m.ModifyClassPage })));
export const ModifySectionPage = lazy(() => import("./classes-sections/ClassesSectionsPages").then((m) => ({ default: m.ModifySectionPage })));
export const DeleteClassPage = lazy(() => import("./classes-sections/ClassesSectionsPages").then((m) => ({ default: m.DeleteClassPage })));
export const DeleteSectionPage = lazy(() => import("./classes-sections/ClassesSectionsPages").then((m) => ({ default: m.DeleteSectionPage })));

export const BatchesHomePage = lazy(() => import("./batches/BatchPages").then((m) => ({ default: m.BatchesHomePage })));
export const AddBatchWorkflowPage = lazy(() => import("./batches/BatchPages").then((m) => ({ default: m.AddBatchPage })));
export const ModifyBatchPage = lazy(() => import("./batches/BatchPages").then((m) => ({ default: m.ModifyBatchPage })));
export const DeleteBatchPage = lazy(() => import("./batches/BatchPages").then((m) => ({ default: m.DeleteBatchPage })));

export const SubjectsHomePage = lazy(() => import("./subjects/SubjectPages").then((m) => ({ default: m.SubjectsHomePage })));
export const AddSubjectPage = lazy(() => import("./subjects/SubjectPages").then((m) => ({ default: m.AddSubjectPage })));
export const ModifySubjectPage = lazy(() => import("./subjects/SubjectPages").then((m) => ({ default: m.ModifySubjectPage })));
export const DeleteSubjectPage = lazy(() => import("./subjects/SubjectPages").then((m) => ({ default: m.DeleteSubjectPage })));

export const SyllabusHomePage = lazy(() => import("./syllabus/SyllabusPages").then((m) => ({ default: m.SyllabusHomePage })));
export const AddSyllabusPage = lazy(() => import("./syllabus/SyllabusPages").then((m) => ({ default: m.AddSyllabusPage })));
export const ModifySyllabusPage = lazy(() => import("./syllabus/SyllabusPages").then((m) => ({ default: m.ModifySyllabusPage })));
export const DeleteSyllabusPage = lazy(() => import("./syllabus/SyllabusPages").then((m) => ({ default: m.DeleteSyllabusPage })));

export const TeachersHomePage = lazy(() => import("./teachers/TeacherPages").then((m) => ({ default: m.TeachersHomePage })));
export const AddTeacherPage = lazy(() => import("./teachers/TeacherPages").then((m) => ({ default: m.AddTeacherPage })));
export const ModifyTeacherPage = lazy(() => import("./teachers/TeacherPages").then((m) => ({ default: m.ModifyTeacherPage })));
export const DeleteTeacherPage = lazy(() => import("./teachers/TeacherPages").then((m) => ({ default: m.DeleteTeacherPage })));

export const StudentsHomePage = lazy(() => import("./students/StudentPages").then((m) => ({ default: m.StudentsHomePage })));
export const AddStudentPage = lazy(() => import("./students/StudentPages").then((m) => ({ default: m.AddStudentPage })));
export const ModifyStudentPage = lazy(() => import("./students/StudentPages").then((m) => ({ default: m.ModifyStudentPage })));
export const DeleteStudentPage = lazy(() => import("./students/StudentPages").then((m) => ({ default: m.DeleteStudentPage })));

export const PromotionHomePage = lazy(() => import("./promotions/PromotionPages").then((m) => ({ default: m.PromotionHomePage })));
export const FeeStructureHomePage = lazy(() => import("./finance/FeeStructurePages").then((m) => ({ default: m.FeeStructureHomePage })));
export const PaymentsHubPage = lazy(() => import("./finance/PaymentsPages").then((m) => ({ default: m.PaymentsHubPage })));
export const PaymentsRegisterPage = lazy(() => import("./finance/PaymentsPages").then((m) => ({ default: m.PaymentsRegisterPage })));
export const PaymentsHistoryPage = lazy(() => import("./finance/PaymentsPages").then((m) => ({ default: m.PaymentsHistoryPage })));

export const ModuleHistoryPage = lazy(() => import("./shared/ModuleHistoryPage").then((m) => ({ default: m.ModuleHistoryPage })));

export const AnnouncementsHubPage = lazy(() => import("./announcements/AnnouncementPages").then((m) => ({ default: m.AnnouncementsHubPage })));
export const AnnouncementCreatePage = lazy(() => import("./announcements/AnnouncementPages").then((m) => ({ default: m.AnnouncementCreatePage })));
export const AnnouncementHistoryPage = lazy(() => import("./announcements/AnnouncementPages").then((m) => ({ default: m.AnnouncementHistoryPage })));
export const AnnouncementModifyListPage = lazy(() => import("./announcements/AnnouncementPages").then((m) => ({ default: m.AnnouncementModifyListPage })));
export const AnnouncementModifyEditPage = lazy(() => import("./announcements/AnnouncementPages").then((m) => ({ default: m.AnnouncementModifyEditPage })));
export const AnnouncementArchivePage = lazy(() => import("./announcements/AnnouncementPages").then((m) => ({ default: m.AnnouncementArchivePage })));

export const FeedbackHubPage = lazy(() => import("./feedback/FeedbackPages").then((m) => ({ default: m.FeedbackHubPage })));
export const FeedbackCreateFormPage = lazy(() => import("./feedback/FeedbackPages").then((m) => ({ default: m.FeedbackCreateFormPage })));
export const FeedbackActiveFormsPage = lazy(() => import("./feedback/FeedbackPages").then((m) => ({ default: m.FeedbackActiveFormsPage })));
export const FeedbackArchivedPage = lazy(() => import("./feedback/FeedbackPages").then((m) => ({ default: m.FeedbackArchivedPage })));
export const FeedbackReportsHubPage = lazy(() => import("./feedback/FeedbackPages").then((m) => ({ default: m.FeedbackReportsHubPage })));
export const FeedbackReportDetailPage = lazy(() => import("./feedback/FeedbackPages").then((m) => ({ default: m.FeedbackReportDetailPage })));
export const FeedbackParagraphAnswersPage = lazy(() => import("./feedback/FeedbackPages").then((m) => ({ default: m.FeedbackParagraphAnswersPage })));
export const StudentFeedbackListPage = lazy(() => import("./feedback/FeedbackPages").then((m) => ({ default: m.StudentFeedbackListPage })));
export const StudentFeedbackFillPage = lazy(() => import("./feedback/FeedbackPages").then((m) => ({ default: m.StudentFeedbackFillPage })));

export const AdminDashboardPage = lazy(() => import("./portals/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
export const AdminPortal = lazy(() => import("./portals/AdminPortal").then((m) => ({ default: m.AdminPortal })));
export const DatabasePortal = lazy(() => import("./portals/DatabasePortal").then((m) => ({ default: m.DatabasePortal })));
export const TeacherPortal = lazy(() => import("./portals/TeacherPortal").then((m) => ({ default: m.TeacherPortal })));
export const StudentPortal = lazy(() => import("./portals/StudentPortal").then((m) => ({ default: m.StudentPortal })));
