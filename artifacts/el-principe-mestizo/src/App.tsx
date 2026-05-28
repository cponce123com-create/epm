import { Switch, Route, Router as WouterRouter } from "wouter";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Redirect } from "wouter";
import { lazy, Suspense } from "react";

// ── Lazy-loaded public routes (code splitting) ─────────────────────────────
const Home = lazy(() => import("@/pages/Home"));
const Article = lazy(() => import("@/pages/Article"));
const Category = lazy(() => import("@/pages/Category"));
const Search = lazy(() => import("@/pages/Search"));
const About = lazy(() => import("@/pages/About"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Lazy-loaded admin pages (code splitting)
const Login = lazy(() => import("@/pages/admin/Login"));
const Dashboard = lazy(() => import("@/pages/admin/Dashboard"));
const ArticleList = lazy(() => import("@/pages/admin/ArticleList"));
const ArticleEditor = lazy(() => import("@/pages/admin/ArticleEditor"));
const Comments = lazy(() => import("@/pages/admin/Comments"));
const Categories = lazy(() => import("@/pages/admin/Categories"));
const Settings = lazy(() => import("@/pages/admin/Settings"));
const MediumImport = lazy(() => import("@/pages/admin/MediumImport"));
const Nacional = lazy(() => import("@/pages/admin/Nacional"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const Editors = lazy(() => import("@/pages/admin/Editors"));
const ReviewQueue = lazy(() => import("@/pages/admin/ReviewQueue"));
const MyProfile = lazy(() => import("@/pages/admin/MyProfile"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // No reintentar en errores 401 (sesión expirada)
      retry: (failureCount, error) => {
        if ((error as any)?.status === 401) return false;
        return failureCount < 1;
      },
    },
    mutations: {
      onError: (error: any) => {
        const msg = error?.message || error?.error || "Error inesperado";
        toast.error(msg, { duration: 5000 });
      },
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isVerifying } = useAuth();
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[hsl(210_15%_10%)] flex items-center justify-center">
        <div className="text-white font-sans-ui text-sm">Verificando sesión...</div>
      </div>
    );
  }
  if (!isAuthenticated) return <Redirect to="/admin/login" />;
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-sans-ui text-sm">Cargando...</div>
      </div>
    }>
      <Component />
    </Suspense>
  );
}

function AdminFallback({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-sans-ui text-sm">Cargando...</div>
      </div>
    }>
      <Component />
    </Suspense>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/articulo/:slug" component={Article} />
      <Route path="/categoria/:slug" component={Category} />
      <Route path="/buscar" component={Search} />
      <Route path="/acerca-de" component={About} />
      <Route path="/admin/login">
        {() => <AdminFallback component={Login} />}
      </Route>
      <Route path="/admin/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/admin/articles">
        {() => <ProtectedRoute component={ArticleList} />}
      </Route>
      <Route path="/admin/articles/new">
        {() => <ProtectedRoute component={ArticleEditor} />}
      </Route>
      <Route path="/admin/articles/:id/edit">
        {() => <ProtectedRoute component={ArticleEditor} />}
      </Route>
      <Route path="/admin/comments">
        {() => <ProtectedRoute component={Comments} />}
      </Route>
      <Route path="/admin/categories">
        {() => <ProtectedRoute component={Categories} />}
      </Route>
      <Route path="/admin/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>
      <Route path="/admin/nacional">
        {() => <ProtectedRoute component={Nacional} />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} />}
      </Route>
      <Route path="/admin/import-medium">
        {() => <ProtectedRoute component={MediumImport} />}
      </Route>
      <Route path="/admin/editors">
        {() => <ProtectedRoute component={Editors} />}
      </Route>
      <Route path="/admin/review">
        {() => <ProtectedRoute component={ReviewQueue} />}
      </Route>
      <Route path="/admin/profile">
        {() => <ProtectedRoute component={MyProfile} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
      <Helmet>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#15140F" />
        <meta name="application-name" content="El Príncipe Mestizo" />
        <meta property="og:locale" content="es_PE" />
        <meta name="twitter:site" content="@elprincipemestizo" />
        <meta name="twitter:creator" content="@elprincipemestizo" />
        <link rel="canonical" href={import.meta.env.VITE_SITE_URL ?? window.location.origin} />
      </Helmet>
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </WouterRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
