import { Link } from "wouter";
import { FileText, MessageSquare, Eye, PenSquare, PlusCircle } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminGetStats, useGetMostRead, useAdminGetComments } from "@workspace/api-client-react";

export default function Dashboard() {
  const { data: stats } = useAdminGetStats();
  const { data: mostRead } = useGetMostRead();
  const { data: comments } = useAdminGetComments({ status: "pending" });

  const statCards = [
    { label: "Publicados", value: stats?.publishedArticles ?? 0, icon: FileText, color: "bg-blue-50 text-blue-600", link: "/admin/articles" },
    { label: "Pendientes", value: stats?.pendingComments ?? 0, icon: MessageSquare, color: "bg-yellow-50 text-yellow-600", link: "/admin/comments" },
    { label: "Total artículos", value: stats?.totalArticles ?? 0, icon: Eye, color: "bg-green-50 text-green-600", link: "/admin/articles" },
    { label: "Borradores", value: stats?.draftArticles ?? 0, icon: PenSquare, color: "bg-purple-50 text-purple-600", link: "/admin/articles" },
  ];

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold">Dashboard</h1>
            <p className="text-sm font-sans-ui text-muted-foreground mt-1">Bienvenido al panel de El Príncipe Mestizo</p>
          </div>
          <Link
            href="/admin/articles/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-sans-ui text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
          >
            <PlusCircle size={16} />
            Nuevo artículo
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map(card => {
            const Icon = card.icon;
            return (
              <Link key={card.label} href={card.link} className="bg-card border border-card-border rounded-lg p-5 hover:shadow-sm transition-shadow">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
                  <Icon size={18} />
                </div>
                <div className="font-display text-2xl font-bold mb-0.5">{card.value}</div>
                <div className="font-sans-ui text-xs text-muted-foreground">{card.label}</div>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Most read */}
          <div className="bg-card border border-card-border rounded-lg p-5">
            <h2 className="font-display font-semibold text-base mb-4">Lo más leído</h2>
            {!mostRead || mostRead.length === 0 ? (
              <p className="text-sm font-sans-ui text-muted-foreground">Sin datos aún.</p>
            ) : (
              <ol className="space-y-3">
                {mostRead.slice(0, 5).map((article, i) => (
                  <li key={article.id} className="flex items-start gap-3">
                    <span className="font-display text-xl font-bold text-muted-foreground/30 w-5 shrink-0">{i + 1}</span>
                    <div>
                      <Link
                        href={`/admin/articles/${article.id}/edit`}
                        className="text-sm font-sans-ui font-medium hover:text-primary transition-colors line-clamp-2"
                      >
                        {article.title}
                      </Link>
                      <p className="text-xs text-muted-foreground font-sans-ui mt-0.5">{article.views ?? 0} visitas</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Pending comments */}
          <div className="bg-card border border-card-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-base">Comentarios pendientes</h2>
              <Link href="/admin/comments" className="text-xs font-sans-ui text-primary hover:underline">Ver todos</Link>
            </div>
            {!comments || comments.length === 0 ? (
              <p className="text-sm font-sans-ui text-muted-foreground">No hay comentarios pendientes.</p>
            ) : (
              <ul className="space-y-3">
                {comments.slice(0, 5).map(comment => (
                  <li key={comment.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                    <span className="text-sm font-sans-ui font-medium">{comment.authorName}</span>
                    <p className="text-xs font-sans-ui text-muted-foreground line-clamp-2 mt-0.5">{comment.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
