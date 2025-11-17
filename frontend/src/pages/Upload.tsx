import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload as UploadIcon, FileText, LogOut, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Upload = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile);
    } else {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file',
        variant: 'destructive'
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file',
        variant: 'destructive'
      });
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    
    // Simulate processing
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        localStorage.setItem('salesData', text);
        toast({ title: 'Success!', description: 'Data processed successfully' });
        navigate('/dashboard');
      };
      reader.readAsText(file);
    }, 2000);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-accent" />
            <span className="font-bold text-lg">Sales Analytics</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {user?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">Upload Sales Data</h1>
            <p className="text-muted-foreground">Upload your CSV file to get AI-powered predictions</p>
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Data Upload</CardTitle>
              <CardDescription>
                Upload a CSV file with columns: Date, Product, Sales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center transition-all
                  ${isDragging ? 'border-accent bg-accent/5' : 'border-border'}
                  ${file ? 'bg-accent/5' : ''}
                `}
              >
                {file ? (
                  <div className="space-y-4">
                    <FileText className="w-16 h-16 mx-auto text-accent" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={handleProcess} disabled={isProcessing}>
                        {isProcessing ? 'Processing...' : 'Process Data'}
                      </Button>
                      <Button variant="outline" onClick={() => setFile(null)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <UploadIcon className="w-16 h-16 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-lg font-medium mb-1">
                        Drag and drop your CSV file here
                      </p>
                      <p className="text-sm text-muted-foreground">or</p>
                    </div>
                    <div>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button asChild>
                          <span>Browse Files</span>
                        </Button>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Upload;
