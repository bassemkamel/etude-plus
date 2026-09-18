import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { trackEvent } from "@/lib/analytics";
import { AuthProvider, useAuth, getDashboardPath, getImpersonationState } from "@/hooks/use-auth";
import { getToken } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";

// Pages
import { Landing } from "@/pages/Landing";
import { About } from "@/pages/About";
import { Pricing } from "@/pages/Pricing";
import { PublicBrowse } from "@/pages/PublicBrowse";
import { Account } from "@/pages/Account";
import { SelectRole } from "@/pages/SelectRole";
import { Login } from "@/pages/auth/Login";
import { Register } from "@/pages/auth/Register";

// Student Pages
import { StudentDashboard } from "@/pages/student/StudentDashboard";
import { StudentCalendar } from "@/pages/student/StudentCalendar";
import { StudentGrades } from "@/pages/student/StudentGrades";
import { StudentPayments } from "@/pages/student/StudentPayments";
import { StudentNotifications } from "@/pages/student/StudentNotifications";
import { StudentSettings } from "@/pages/student/StudentSettings";
import { StudentProgress } from "@/pages/student/StudentProgress";
import { RevisionHub } from "@/pages/revision/BanqueDeQuestions";
import { RevisionSubject } from "@/pages/revision/RevisionSubject";
import { BanqueDeQuestionsSubject } from "@/pages/revision/BanqueDeQuestionsSubject";
import { BanqueDeQuestionsTopic } from "@/pages/revision/BanqueDeQuestionsTopic";
import { Annales as ExamensBlancsPage } from "@/pages/revision/Annales";
import { ExamensPratiques } from "@/pages/revision/ExamensPratiques";
import { Flashcards } from "@/pages/revision/Flashcards";
import { FlashcardsTopic } from "@/pages/revision/FlashcardsTopic";

// MVP: professor pages suppressed — imports kept for easy restore
// import { BrowseClasses } from "@/pages/student/BrowseClasses";
// import { StudentClasses } from "@/pages/student/StudentClasses";
// import { StudentClassDetail } from "@/pages/student/StudentClassDetail";
// import { CoursePreview } from "@/pages/student/CoursePreview";
// import { MonProfEtude } from "@/pages/student/MonProfEtude";
// import { ProfessorProfile } from "@/pages/student/ProfessorProfile";
// import { Checkout } from "@/pages/checkout/Checkout";
// import { PaymentSuccess } from "@/pages/checkout/PaymentSuccess";
// import { Classroom } from "@/pages/classroom/Classroom";
// import { ProfessorDashboard } from "@/pages/professor/ProfessorDashboard";
// import { ProfessorClasses } from "@/pages/professor/ProfessorClasses";
// import { ProfessorClassManagement } from "@/pages/professor/ProfessorClassManagement";
// import { CreateClass } from "@/pages/professor/CreateClass";
// import { ProfessorCalendar } from "@/pages/professor/ProfessorCalendar";
// import { ProfessorEarnings } from "@/pages/professor/ProfessorEarnings";
// import { ProfessorStudents } from "@/pages/professor/ProfessorStudents";
// import { ProfessorSettings } from "@/pages/professor/ProfessorSettings";
// import { ProfessorKYC } from "@/pages/professor/ProfessorKYC";
// import { ProfessorQualifications } from "@/pages/professor/ProfessorQualifications";

// Admin Pages
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminUsers } from "@/pages/admin/AdminUsers";
import { AdminFinances } from "@/pages/admin/AdminFinances";
import { AdminSettings } from "@/pages/admin/AdminSettings";
import { AdminAuditLogs } from "@/pages/admin/AdminAuditLogs";
// import { AdminVideos } from "@/pages/admin/AdminVideos"; // shorts feature disabled
import { AdminAnalytics } from "@/pages/admin/AdminAnalytics";
import { KnowledgeBase } from "@/pages/admin/KnowledgeBase";
import { AdminKnowledgeBase } from "@/pages/admin/AdminKnowledgeBase";
import { AdminManualQuestion } from "@/pages/admin/AdminManualQuestion";
import { AdminCurriculum } from "@/pages/admin/AdminCurriculum";

// Legal pages
import { Terms } from "@/pages/Terms";
import { Privacy } from "@/pages/Privacy";
import { Cookies } from "@/pages/Cookies";

// Cookie consent
import { CookieBanner } from "@/components/CookieBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // data stays fresh 5 min — no refetch on nav back
      gcTime: 10 * 60 * 1000,         // keep in memory 10 min after component unmounts
      retry: 1,                        // one retry on failure instead of default 3
      refetchOnWindowFocus: false,     // don't refetch when user alt-tabs back
    },
  },
});

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Protected Route Component
function ProtectedRoute({ component: Component, allowedRoles }: { component: any, allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  // Show spinner while auth query is in flight
  if (isLoading) return <Spinner />;

  // Safety net: if a token exists but user hasn't propagated yet (e.g. setQueryData
  // race between loginFn and the initial unauthenticated /me request), wait one
  // more render rather than bouncing immediately to /login.
  if (!user && getToken()) return <Spinner />;

  if (!user) {
    return <Redirect to="/login" />;
  }

  // During impersonation the server cookie may still resolve to the admin, so use
  // the target's role (stored in localStorage) for routing decisions instead.
  const imp = getImpersonationState();
  const effectiveRole = imp ? imp.targetUser.role : user.role;

  if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
    return <Redirect to={getDashboardPath(effectiveRole)} />;
  }

  return <Component />;
}

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    trackEvent("page_view", { path: location });
  }, [location]);

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/about" component={About} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/cookies" component={Cookies} />
      <Route path="/courses" component={PublicBrowse} />
      <Route path="/account">
        {() => <ProtectedRoute component={Account} />}
      </Route>
      <Route path="/select-role" component={SelectRole} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Student Routes */}
      <Route path="/student/dashboard">
        {() => <ProtectedRoute component={StudentDashboard} allowedRoles={["student"]} />}
      </Route>
      <Route path="/student/calendar">
        {() => <ProtectedRoute component={StudentCalendar} allowedRoles={["student"]} />}
      </Route>
      <Route path="/student/grades">
        {() => <ProtectedRoute component={StudentGrades} allowedRoles={["student"]} />}
      </Route>
      <Route path="/student/payments">
        {() => <ProtectedRoute component={StudentPayments} allowedRoles={["student"]} />}
      </Route>
      <Route path="/student/notifications">
        {() => <ProtectedRoute component={StudentNotifications} allowedRoles={["student"]} />}
      </Route>
      <Route path="/student/settings">
        {() => <ProtectedRoute component={StudentSettings} allowedRoles={["student"]} />}
      </Route>
      <Route path="/student/progress">
        {() => <ProtectedRoute component={StudentProgress} allowedRoles={["student"]} />}
      </Route>

      {/* MVP: class/professor/booking student routes suppressed — uncomment to restore
      <Route path="/student/browse">
        {() => <ProtectedRoute component={BrowseClasses} allowedRoles={["student"]} />}
      </Route>
      <Route path="/student/browse/:id">
        {() => <ProtectedRoute component={CoursePreview} allowedRoles={["student"]} />}
      </Route>
      <Route path="/student/professor/:id">
        {() => <ProtectedRoute component={ProfessorProfile} allowedRoles={["student"]} />}
      </Route>
      <Route path="/student/classes">
        {() => <ProtectedRoute component={StudentClasses} allowedRoles={["student"]} />}
      </Route>
      <Route path="/student/classes/:id">
        {() => <ProtectedRoute component={StudentClassDetail} allowedRoles={["student"]} />}
      </Route>
      <Route path="/student/mon-prof">
        {() => <ProtectedRoute component={MonProfEtude} allowedRoles={["student"]} />}
      </Route>
      */}

      {/* Révision Étude+ Routes — most specific first */}
      <Route path="/revision/:subject/banque-de-questions/:topic">
        {() => <ProtectedRoute component={BanqueDeQuestionsTopic} allowedRoles={["student"]} />}
      </Route>
      <Route path="/revision/:subject/banque-de-questions">
        {() => <ProtectedRoute component={BanqueDeQuestionsSubject} allowedRoles={["student"]} />}
      </Route>
      {/* Examens Blancs — backed by annales table via GET /api/revision/content/annales */}
      <Route path="/revision/:subject/examens-blancs">
        {() => <ProtectedRoute component={ExamensBlancsPage} allowedRoles={["student"]} />}
      </Route>
      {/* Examens Pratiques — backed by questions table via GET /api/revision/content/questions */}
      <Route path="/revision/:subject/examens-pratiques">
        {() => <ProtectedRoute component={ExamensPratiques} allowedRoles={["student"]} />}
      </Route>
      <Route path="/revision/:subject/flashcards/:topic">
        {() => <ProtectedRoute component={FlashcardsTopic} allowedRoles={["student"]} />}
      </Route>
      <Route path="/revision/:subject/flashcards">
        {() => <ProtectedRoute component={Flashcards} allowedRoles={["student"]} />}
      </Route>
      {/* Legacy redirects — old routes that no longer have UI cards */}
      <Route path="/revision/:subject/annales">
        {() => <Redirect to="/revision" />}
      </Route>
      <Route path="/revision/:subject/notions-cles">
        {() => <Redirect to="/revision" />}
      </Route>
      <Route path="/revision/:subject">
        {() => <ProtectedRoute component={RevisionSubject} allowedRoles={["student"]} />}
      </Route>
      <Route path="/revision">
        {() => <ProtectedRoute component={RevisionHub} allowedRoles={["student"]} />}
      </Route>

      {/* MVP: checkout/classroom suppressed — uncomment to restore
      <Route path="/checkout/:id">
        {() => <ProtectedRoute component={Checkout} allowedRoles={["student"]} />}
      </Route>
      <Route path="/payment-success">
        {() => <ProtectedRoute component={PaymentSuccess} allowedRoles={["student"]} />}
      </Route>
      <Route path="/classroom/:id">
        {() => <ProtectedRoute component={Classroom} />}
      </Route>
      */}

      {/* MVP: all professor routes suppressed — uncomment to restore
      <Route path="/professor/dashboard">
        {() => <ProtectedRoute component={ProfessorDashboard} allowedRoles={["professor"]} />}
      </Route>
      <Route path="/professor/classes">
        {() => <ProtectedRoute component={ProfessorClasses} allowedRoles={["professor"]} />}
      </Route>
      <Route path="/professor/classes/:id">
        {() => <ProtectedRoute component={ProfessorClassManagement} allowedRoles={["professor"]} />}
      </Route>
      <Route path="/professor/create-class">
        {() => <ProtectedRoute component={CreateClass} allowedRoles={["professor"]} />}
      </Route>
      <Route path="/professor/calendar">
        {() => <ProtectedRoute component={ProfessorCalendar} allowedRoles={["professor"]} />}
      </Route>
      <Route path="/professor/earnings">
        {() => <ProtectedRoute component={ProfessorEarnings} allowedRoles={["professor"]} />}
      </Route>
      <Route path="/professor/students">
        {() => <ProtectedRoute component={ProfessorStudents} allowedRoles={["professor"]} />}
      </Route>
      <Route path="/professor/settings">
        {() => <ProtectedRoute component={ProfessorSettings} allowedRoles={["professor"]} />}
      </Route>
      <Route path="/professor/kyc">
        {() => <ProtectedRoute component={ProfessorKYC} allowedRoles={["professor"]} />}
      </Route>
      <Route path="/professor/qualifications">
        {() => <ProtectedRoute component={ProfessorQualifications} allowedRoles={["professor"]} />}
      </Route>
      */}

      {/* Admin Routes */}
      <Route path="/admin/dashboard">
        {() => <ProtectedRoute component={AdminDashboard} allowedRoles={["admin", "super_admin"]} />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} allowedRoles={["admin", "super_admin"]} />}
      </Route>
      {/* Knowledge Base folder manager — main admin content tool */}
      <Route path="/admin/knowledge-base">
        {() => <ProtectedRoute component={AdminKnowledgeBase} allowedRoles={["admin", "super_admin"]} />}
      </Route>
      {/* Manual question entry — bypass AI pipeline */}
      <Route path="/admin/manual-question">
        {() => <ProtectedRoute component={AdminManualQuestion} allowedRoles={["admin", "super_admin"]} />}
      </Route>
      {/* Curriculum browser — navigate class → subject → chapter → content */}
      <Route path="/admin/curriculum">
        {() => <ProtectedRoute component={AdminCurriculum} allowedRoles={["admin", "super_admin"]} />}
      </Route>

      {/* Hidden legacy KB tool — accessed by typing /kb directly */}
      <Route path="/kb" component={KnowledgeBase} />

      {/* Super Admin only routes */}
      <Route path="/admin/analytics">
        {() => <ProtectedRoute component={AdminAnalytics} allowedRoles={["super_admin"]} />}
      </Route>
      <Route path="/admin/finances">
        {() => <ProtectedRoute component={AdminFinances} allowedRoles={["super_admin"]} />}
      </Route>
      <Route path="/admin/audit-logs">
        {() => <ProtectedRoute component={AdminAuditLogs} allowedRoles={["super_admin"]} />}
      </Route>
      <Route path="/admin/settings">
        {() => <ProtectedRoute component={AdminSettings} allowedRoles={["super_admin"]} />}
      </Route>
      {/* /admin/videos route disabled — shorts feature suppressed */}

      {/* Redirect deprecated/suppressed routes to dashboard */}
      <Route path="/admin/professors">
        {() => <Redirect to="/admin/users" />}
      </Route>
      <Route path="/admin/classes">
        {() => <Redirect to="/admin/dashboard" />}
      </Route>
      <Route path="/admin/transactions">
        {() => <Redirect to="/admin/finances" />}
      </Route>
      <Route path="/student/browse">
        {() => <Redirect to="/student/dashboard" />}
      </Route>
      <Route path="/student/classes">
        {() => <Redirect to="/student/dashboard" />}
      </Route>
      <Route path="/student/mon-prof">
        {() => <Redirect to="/student/dashboard" />}
      </Route>
      <Route path="/professor/*">
        {() => <Redirect to="/student/dashboard" />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={400}>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <ErrorBoundary>
                <Router />
              </ErrorBoundary>
            </WouterRouter>
            <Toaster />
            <CookieBanner />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
