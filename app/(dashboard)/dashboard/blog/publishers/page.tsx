import BlogPublishers from '../components/BlogPublishers';

export default function PublishersPage() {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Editorial Board
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage editorial contributors, author signatures, and publishing privileges across the platform.
        </p>
      </div>

      {/* Main Content Workspace */}
      <div className="pt-2">
        <BlogPublishers />
      </div>
      
    </div>
  );
}