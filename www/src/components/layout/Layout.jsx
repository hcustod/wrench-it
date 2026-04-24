import { useLocation } from 'react-router-dom';
import Navigation from './Navigation.jsx';
import Footer from './Footer.jsx';

export default function Layout({ children }) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-vh-100 d-flex flex-column">
      <Navigation />
      <main className={`flex-grow-1 ${isHome ? 'wt-main-home' : ''}`}>
        {isHome ? children : <div className="container py-4">{children}</div>}
      </main>
      <Footer />
    </div>
  );
}
