
import { useIsMobile } from '@/hooks/use-mobile';
import Logo from '@/components/layout/Logo';
import RegistrationForm from '@/components/auth/RegistrationForm';
import { Link } from 'react-router-dom';

const Index = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12">
          <div className="flex justify-center md:justify-start">
            <Link to="/">
              <Logo size={isMobile ? 'sm' : 'md'} />
            </Link>
          </div>
        </header>
        
        <main className="flex justify-center items-center py-8">
          <RegistrationForm />
        </main>
      </div>
    </div>
  );
};

export default Index;
