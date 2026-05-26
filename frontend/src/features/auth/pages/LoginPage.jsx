import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuthStore();
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const result = await login(formData);

    if (result.success) {
      toast.success('Вхід виконано');
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } else {
      setFormError(result.error || 'Не вдалося увійти');
    }
  };

  const handleChange = (e) => {
    setFormError('');
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Вхід у PrepAI
          </h1>
          <p className="text-sm text-muted-foreground">
            Введіть свої дані для доступу до системи
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Увійти</CardTitle>
            <CardDescription>
              Продовжуй роботу зі своїми шаблонами та спробами
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Електронна пошта</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              {formError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Завантаження...' : 'Увійти'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Ще немає акаунта?{' '}
                <Link to="/register" className="text-foreground underline underline-offset-4 hover:text-primary">
                  Зареєструватися
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
