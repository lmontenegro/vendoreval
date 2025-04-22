import VendorEditClient from './Client';

export default function VendorEditPage({ params }: { params: { id: string } }) {
  return <VendorEditClient id={params.id} />;
} 