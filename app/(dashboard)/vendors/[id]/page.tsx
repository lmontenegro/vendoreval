import { redirect } from 'next/navigation';

// Esta función es necesaria para el modo estático de Next.js
export const generateStaticParams = async () => {
  // Puedes dejar este arreglo vacío o, para optimizar,
  // obtener algunos IDs de vendors más visitados para pre-renderizar
  return [];
};

export default function VendorPage({ params }: { params: { id: string } }) {
  redirect(`/vendors/${params.id}/edit`);
}