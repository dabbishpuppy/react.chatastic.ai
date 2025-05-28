
import { useIsMobile } from '@/hooks/use-mobile';
import Logo from '@/components/layout/Logo';
import RegistrationForm from '@/components/auth/RegistrationForm';

const Index = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12">
          <div className="flex justify-center md:justify-start">
            <Logo size={isMobile ? 'sm' : 'md'} />
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
