import ProfileForm from './components/ProfileForm';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Profile</h1>
        <p className="text-sm text-muted-foreground">View and update your admin account details.</p>
      </div>
      <ProfileForm />
    </div>
  );
}
