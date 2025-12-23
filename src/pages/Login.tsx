import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Logo } from '../components/ui/Logo';
import { Phone, BarChart3, Users, Zap } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      try {
        await signIn('demo@orah.ai', 'demo123456');
        navigate('/dashboard');
      } catch {
        const demoCompanyId = '11111111-1111-1111-1111-111111111111';
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: 'demo@orah.ai',
          password: 'demo123456',
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Demo user creation failed');

        const { error: profileError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: 'demo@orah.ai',
          name: 'Demo User',
          company_id: demoCompanyId,
          role: 'admin',
        });

        if (profileError) throw profileError;

        await signIn('demo@orah.ai', 'demo123456');
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Phone, title: 'AI Voice Calls', desc: 'Automated lead qualification' },
    { icon: BarChart3, title: 'Smart Analytics', desc: 'Real-time insights' },
    { icon: Users, title: 'Lead Management', desc: 'Streamlined workflows' },
    { icon: Zap, title: 'Instant Sync', desc: 'Google Sheets integration' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-cyan-500/20"></div>
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-3 mb-8">
            <Logo variant="icon" className="w-12 h-12 text-white" />
            <span className="text-3xl font-bold text-white">ORAH</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
            AI-Powered Lead<br />Management Platform
          </h1>
          <p className="text-lg text-slate-300 mb-12 max-w-md">
            Transform your real estate business with intelligent voice AI and automated lead qualification.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/15 transition-all duration-300"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <feature.icon className="w-8 h-8 text-cyan-400 mb-3" />
                <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4 lg:hidden">
              <Logo variant="icon" className="w-14 h-14" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Welcome Back</CardTitle>
            <p className="text-slate-500 text-sm mt-2">Sign in to access your dashboard</p>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200 animate-shake">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-slate-600">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-medium">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                onClick={handleDemoLogin}
                disabled={loading}
              >
                <Zap className="w-4 h-4 mr-2" />
                Try Demo Account
              </Button>

              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-4">
                <p className="font-semibold text-slate-800 mb-2 text-sm">Demo Credentials</p>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="text-slate-600">Email: <span className="font-mono text-slate-800">demo@orah.ai</span></p>
                    <p className="text-slate-600">Password: <span className="font-mono text-slate-800">demo123456</span></p>
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-slate-600">
                Don't have an account?{' '}
                <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Create account
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
