import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, TrendingUp, Download, Upload as UploadIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SalesData {
  date: string;
  sales: number;
  predicted?: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [data, setData] = useState<SalesData[]>([]);
  const [stats, setStats] = useState({ total: 0, avg: 0, growth: 0 });

  // 🔥 ใหม่: state สำหรับ AI process
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const csvData = localStorage.getItem('salesData');
    if (!csvData) {
      navigate('/upload');
      return;
    }

    const runPipeline = async () => {
      // เริ่ม process เอไอ
      setIsProcessing(true);
      setProgress(0);

      // ทำให้ progress ค่อย ๆ ขึ้น (ปลอม ๆ) ระหว่างรอเอไอจริง
      const intervalId = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev; // ล็อกไว้ไม่ให้เกิน 90 ก่อนเอไอเสร็จ
          return prev + 5;
        });
      }, 250);

      try {
        // 1) Parse CSV
        const lines = csvData.split('\n').slice(1);
        const parsed: SalesData[] = [];
        let total = 0;

        lines.forEach(line => {
          const [date, , sales] = line.split(',');
          if (date && sales) {
            const value = parseFloat(sales);
            parsed.push({ date: date.trim(), sales: value });
            total += value;
          }
        });

        // 2) สมมติว่าเรียก AI จริง (ตอนนี้ใช้ setTimeout แทน)
        // ตรงนี้ในอนาคตเปลี่ยนเป็น fetch('/api/predict', { ... }) ได้เลย
        await new Promise(resolve => setTimeout(resolve, 2000)); // จำลองเอไอคิด 2 วิ

        // 3) Generate predictions (เหมือนเดิม)
        const lastValue = parsed[parsed.length - 1]?.sales || 0;
        const avg = total / parsed.length;
        const growth = ((lastValue - avg) / avg) * 100;

        for (let i = 1; i <= 5; i++) {
          const predictedValue = lastValue * (1 + (growth / 100));
          const futureDate = new Date();
          futureDate.setMonth(futureDate.getMonth() + i);
          parsed.push({
            date: futureDate.toISOString().split('T')[0],
            sales: Math.round(predictedValue),
            predicted: true
          });
        }

        setData(parsed);
        setStats({ total, avg: Math.round(avg), growth: Math.round(growth) });

        // 4) ดัน progress ไป 100% แล้วค่อยปิด
        setProgress(100);
        setTimeout(() => {
          setIsProcessing(false);
          setProgress(0);
        }, 500);
      } finally {
        clearInterval(intervalId);
      }
    };

    runPipeline();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleNewUpload = () => {
    navigate('/upload');
  };

  const handleDownload = () => {
    const csv = ['Date,Sales,Type\n'];
    data.forEach(row => {
      csv.push(`${row.date},${row.sales},${row.predicted ? 'Predicted' : 'Actual'}\n`);
    });
    const blob = new Blob(csv, { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales-predictions.csv';
    a.click();
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
            <Button variant="outline" size="sm" onClick={handleNewUpload}>
              <UploadIcon className="w-4 h-4 mr-2" />
              New Upload
            </Button>
            <span className="text-sm text-muted-foreground">Welcome, {user?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {/* 🔥 ใหม่: AI processing bar */}
        {isProcessing && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1 text-sm text-muted-foreground">
              <span>Running AI predictions...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Sales Dashboard</h1>
          <p className="text-muted-foreground">
            AI-powered sales predictions and analytics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className={isProcessing ? 'opacity-60 pointer-events-none' : ''}>
            <CardHeader>
              <CardDescription>Total Sales</CardDescription>
              <CardTitle className="text-3xl">
                {isProcessing ? 'Calculating…' : `$${stats.total.toLocaleString()}`}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className={isProcessing ? 'opacity-60 pointer-events-none' : ''}>
            <CardHeader>
              <CardDescription>Average Sales</CardDescription>
              <CardTitle className="text-3xl">
                {isProcessing ? 'Calculating…' : `$${stats.avg.toLocaleString()}`}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className={isProcessing ? 'opacity-60 pointer-events-none' : ''}>
            <CardHeader>
              <CardDescription>Growth Rate</CardDescription>
              <CardTitle className="text-3xl text-accent">
                {isProcessing ? 'Calculating…' : `${stats.growth}%`}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className={isProcessing ? 'opacity-60 pointer-events-none' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sales Trend & Predictions</CardTitle>
                <CardDescription>Historical data and AI predictions</CardDescription>
              </div>
              <Button onClick={handleDownload} variant="outline" disabled={isProcessing}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--accent))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
