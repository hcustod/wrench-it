import { useParams } from 'react-router-dom';

export default function StoreDetails() {
  const { id } = useParams();

  return (
    <div className="container py-4">
      <h1 className="mb-3">Store Details</h1>
      <p className="text-muted">Store ID: {id}</p>
    </div>
  );
}
