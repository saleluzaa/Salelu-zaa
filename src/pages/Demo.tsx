import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Demo = () => {
  const navigate = useNavigate();
  const { loginAsDemo } = useAuth();

  useEffect(() => {
    // Load demo data
    const demoData = `Date,Product,Sales
2024-01-15,Product A,15000
2024-02-15,Product A,18000
2024-03-15,Product A,22000
2024-04-15,Product A,25000
2024-05-15,Product A,28000
2024-06-15,Product A,31000
2024-01-15,Product B,12000
2024-02-15,Product B,13500
2024-03-15,Product B,15000
2024-04-15,Product B,16500
2024-05-15,Product B,18000
2024-06-15,Product B,19500`;

    localStorage.setItem('salesData', demoData);
    loginAsDemo();
    navigate('/dashboard');
  }, [loginAsDemo, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading demo...</p>
      </div>
    </div>
  );
};

export default Demo;
