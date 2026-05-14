import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Redirect } from "wouter";

import Home from "@/pages/Home";
import Article from "@/pages/Article";
import Category from "@/pages/Category";
import Search from "@/pages/Search";
import About from "@/pages/About";
import Login from "@/pages/admin/Login";
import Dashboard from "@/pages/admin/Dashboard";
import ArticleList from "@/pages/admin/ArticleList";
import ArticleEditor from "@/pages/admin/ArticleEditor";
import Comments from "@/pages/admin/Comments";
import Categories from "@/pages/admin/Categories";
import Settings from "@/pages/admin/Settings";
import MediumImport from "@/pages/admin/MediumImport";
import Nacional from "@/pages/admin/Nacional";
import AdminUsers from "@/pages/admin/AdminUsers";
import Editors from "@/pages/admin/Editors";
import ReviewQueue from "@/pages/admin/ReviewQueue";
import MyProfile from "@/pages/admin/MyProfile";
import NotFound from "@/pages/not-found";

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
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/articulo/:slug" component={Article} />
      <Route path="/categoria/:slug" component={Category} />
      <Route path="/buscar" component={Search} />
      <Route path="/acerca-de" component={About} />
      <Route path="/admin/login" component={Login} />
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
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
