import { Navigate, useParams } from 'react-router-dom';

export default function StoreDetails() {
  const { id } = useParams();
  return <Navigate to={`/shop/${id}`} replace />;
}
