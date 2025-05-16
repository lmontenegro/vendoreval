import { Metadata } from 'next';
import ProfileTabs from './profile-tabs';

export const metadata: Metadata = {
  title: 'Mi Perfil | VendorEval',
  description: 'Gestione su información personal y configuraciones de seguridad.',
}

export default function ProfilePage() {
  return (
    <div className="container py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Gestione su información personal y configuraciones de seguridad
        </p>
      </div>

      <ProfileTabs />
    </div>
  );
}