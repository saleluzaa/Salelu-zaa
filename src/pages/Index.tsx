import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Upload, LineChart } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/upload');
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-accent" />
            <span className="font-bold text-lg">Sales Analytics</span>
          </div>
          <Button onClick={() => navigate('/auth')}>Get Started</Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
            Predict Future Sales with AI
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Upload your sales data and get instant AI-powered predictions. No setup required.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8">
            Start Free Trial
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10">
              <Upload className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">Upload Data</h3>
            <p className="text-muted-foreground">
              Simply drag and drop your CSV files with sales data
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10">
              <TrendingUp className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">AI Analysis</h3>
            <p className="text-muted-foreground">
              Our AI automatically analyzes patterns and trends
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10">
              <LineChart className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">Get Predictions</h3>
            <p className="text-muted-foreground">
              View forecasts and download detailed reports
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
