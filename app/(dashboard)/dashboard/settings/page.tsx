import SettingsForm from './components/SettingsForm';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Account Settings</h1>
        <p className="text-sm text-muted-foreground">Update your account security settings.</p>
      </div>
      <SettingsForm />
    </div>
  );
}
