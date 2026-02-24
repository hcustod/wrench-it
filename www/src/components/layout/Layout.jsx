import Navigation from './Navigation.jsx';
import Footer from './Footer.jsx';

export default function Layout({ children }) {
  return (
    <div className="min-vh-100 d-flex flex-column">
      <Navigation />
      <main className="flex-grow-1">
        <div className="container py-4">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

