import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { AlertCircle } from 'lucide-react';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuthStore();
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'user',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Паролі не збігаються' });
      setFormError('Виправ виділені поля і спробуй ще раз.');
      return;
    }

    const result = await register({
      email: formData.email,
      full_name: formData.full_name,
      role: formData.role,
      password: formData.password,
    });

    if (result.success) {
      toast.success('Акаунт створено! Увійдіть.');
      navigate('/login');
    } else {
      setFormError(result.error || 'Не вдалося створити акаунт');
      setFieldErrors(result.fieldErrors || {});
    }
  };

  const handleChange = (e) => {
    setFormError('');
    setFieldErrors((current) => ({
      ...current,
      [e.target.name]: '',
    }));
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
            Реєстрація в PrepAI
          </h1>
          <p className="text-sm text-muted-foreground">
            Створіть акаунт для роботи з шаблонами та AI-оцінюванням
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Створити акаунт</CardTitle>
            <CardDescription>
              Заповніть дані для доступу до системи
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Повне ім'я</Label>
                <Input
                  id="full_name"
                  type="text"
                  name="full_name"
                  placeholder="Іван Петренко"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                />
                {fieldErrors.full_name && (
                  <p className="text-sm text-destructive">{fieldErrors.full_name}</p>
                )}
              </div>

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
                {fieldErrors.email && (
                  <p className="text-sm text-destructive">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Роль у системі</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'user', label: 'Учасник', description: 'Тренувальні сесії' },
                    { value: 'mentor', label: 'Ментор', description: 'Practice та assessment' },
                  ].map((role) => (
                    <label
                      key={role.value}
                      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                        formData.role === role.value
                          ? 'border-primary bg-primary/5'
                          : 'border-input hover:bg-accent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.value}
                        checked={formData.role === role.value}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className="block font-medium text-sm">{role.label}</span>
                      <span className="block text-xs text-muted-foreground mt-1">{role.description}</span>
                    </label>
                  ))}
                </div>
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
                {fieldErrors.password && (
                  <p className="text-sm text-destructive">{fieldErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Повторіть пароль</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {formError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Завантаження...' : 'Створити акаунт'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Вже маєте акаунт?{' '}
                <Link to="/login" className="text-foreground underline underline-offset-4 hover:text-primary">
                  Увійти
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
