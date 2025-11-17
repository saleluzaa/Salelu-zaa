import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  LogOut,
  TrendingUp,
  Download,
  Upload as UploadIcon,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';

interface SalesData {
  date: string;
  sales: number;
  predicted?: boolean;
}

interface SummaryResponse {
  best_menu: string | null;
  best_menu_total_revenue: number | null;
  worst_menu: string | null;
  best_day_of_week: string | null;
  worst_day_of_week: string | null;
  best_hour: string | null;
  worst_hour: string | null;
  info?: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [data, setData] = useState<SalesData[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const csvData = localStorage.getItem('salesData');
    if (!csvData) {
      navigate('/upload');
      return;
    }

    const runPipeline = async () => {
      setIsProcessing(true);
      setProgress(0);
      setErrorMsg(null);

      // progress line ระหว่างรอ API
      const intervalId = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 5;
        });
      }, 250);

      try {
        // 1) ส่ง CSV ให้ /autoML เพื่อให้ backend เทรน + พยากรณ์ + gen summary
        const file = new File([csvData], 'sales.csv', { type: 'text/csv' });
        const formData = new FormData();
        formData.append('csv_file', file);

        const response = await axios.post(
          'http://127.0.0.1:8000/autoML',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        console.log('BACKEND /autoML RESPONSE:', response.data);

        // 2) ใช้ overall_future_sales วาดกราฟ
        const future: SalesData[] =
          (response.data.overall_future_sales || []).map((row: any) => ({
            date: row.Date,
            sales: row.Predicted_Sale,
            predicted: true,
          }));

        if (!future.length) {
          setData([]);
          setErrorMsg('No forecast data returned from the AI model.');
        } else {
          setData(future);
        }

        // 3) ดึง business summary จาก /summary
        try {
          const summaryRes = await axios.get<SummaryResponse>(
            'http://127.0.0.1:8000/summary'
          );
          console.log('BACKEND /summary RESPONSE:', summaryRes.data);
          setSummary(summaryRes.data);
        } catch (summaryErr: any) {
          console.error('Summary API error:', summaryErr);
          // ถ้ามีปัญหา ก็แค่ไม่มี summary ให้โชว์ แต่ไม่ทำให้หน้าแตก
        }

        setProgress(100);
        setTimeout(() => {
          setIsProcessing(false);
          setProgress(0);
        }, 500);
      } catch (error: any) {
        console.error('AI prediction error:', error);
        setErrorMsg(
          error?.response?.data?.detail ||
            'An error occurred while generating AI predictions.'
        );
        setIsProcessing(false);
        setProgress(0);
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
      csv.push(
        `${row.date},${row.sales},${row.predicted ? 'Predicted' : 'Actual'}\n`
      );
    });
    const blob = new Blob(csv, { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales-predictions.csv';
    a.click();
  };

  // ===== Helper แปลง summary เป็นข้อความสวย ๆ =====

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const bestMenuText = () => {
    if (!summary) return 'No menu insights available yet.';
    if (!summary.best_menu) return 'Best-selling menu item is not available.';
    return `The best-selling menu item is "${summary.best_menu}" with a total estimated revenue of ${formatCurrency(
      summary.best_menu_total_revenue
    )}.`;
  };

  const dayOfWeekText = () => {
    if (!summary) return 'No day-of-week insights available yet.';
    const best = summary.best_day_of_week || 'N/A';
    const worst = summary.worst_day_of_week || 'N/A';
    return `The strongest sales typically occur on ${best}, while the weakest sales tend to be on ${worst}.`;
  };

  const timeInsightText = () => {
    if (!summary) return 'No time-of-day insights available yet.';
    const best = summary.best_hour || 'N/A';
    const worst = summary.worst_hour || 'N/A';

    if (summary.info) {
      // มีข้อความ info จาก backend ให้โชว์เลย
      return `${summary.info} (Best: ${best}, Worst: ${worst})`;
    }

    return `The best-performing time slot is ${best}, while the weakest time slot is ${worst}.`;
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
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {/* progress bar */}
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

        {/* error message ถ้ามี */}
        {errorMsg && (
          <div className="mb-6 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Sales Dashboard</h1>
          <p className="text-muted-foreground">
            AI-powered sales forecasts and business insights
          </p>
        </div>

        {/* 🔹 การ์ดสรุปจาก summary.json */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Best menu */}
          <Card className={isProcessing ? 'opacity-60 pointer-events-none' : ''}>
            <CardHeader>
              <CardDescription>Best performing menu</CardDescription>
              <CardTitle className="text-xl">
                {summary?.best_menu || '—'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Revenue: {formatCurrency(summary?.best_menu_total_revenue ?? null)}
              </p>
              {summary?.worst_menu && (
                <p className="text-xs text-muted-foreground">
                  Weakest menu: {summary.worst_menu}
                </p>
              )}
            </CardHeader>
          </Card>

          {/* Day-of-week */}
          <Card className={isProcessing ? 'opacity-60 pointer-events-none' : ''}>
            <CardHeader>
              <CardDescription>Day-of-week performance</CardDescription>
              <CardTitle className="text-xl">
                {summary?.best_day_of_week || '—'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Weakest day: {summary?.worst_day_of_week || 'N/A'}
              </p>
            </CardHeader>
          </Card>

          {/* Time-of-day */}
          <Card className={isProcessing ? 'opacity-60 pointer-events-none' : ''}>
            <CardHeader>
              <CardDescription>Time-of-day insight</CardDescription>
              <CardTitle className="text-xl text-accent">
                {summary?.best_hour || '—'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Slowest: {summary?.worst_hour || 'N/A'}
              </p>
              {summary?.info && (
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.info}
                </p>
              )}
            </CardHeader>
          </Card>
        </div>

        {/* 🔹 กราฟเส้น: X = Date (YYYY-MM-DD), Y = Sales */}
        <Card className={isProcessing ? 'opacity-60 pointer-events-none' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sales Trend & Predictions</CardTitle>
                <CardDescription>
                  Forecasted daily sales by date
                </CardDescription>
              </div>
              <Button
                onClick={handleDownload}
                variant="outline"
                disabled={isProcessing || !data.length}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{
                    value: 'Date (YYYY-MM-DD)',
                    position: 'insideBottomRight',
                    offset: -5,
                    fill: 'hsl(var(--muted-foreground))',
                  }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{
                    value: 'Sales',
                    angle: -90,
                    position: 'insideLeft',
                    fill: 'hsl(var(--muted-foreground))',
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any) => [`${value} units`, 'Sales']}
                  labelFormatter={(label: any) => `Date: ${label}`}
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
