import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/authStore';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Separator } from '../../components/ui/separator';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors hover:text-foreground ${
      isActive ? 'text-foreground' : 'text-muted-foreground'
    }`;

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-white/85 backdrop-blur-xl header-shadow">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link to="/" className="mr-7 flex items-center gap-2">
            <span className="brand-icon h-10 w-10 rounded-full">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="font-bold text-lg text-foreground">PrepAI</span>
          </Link>
          {isAuthenticated && (
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <NavLink to="/dashboard" className={navLinkClass}>
                Панель
              </NavLink>
              <NavLink to="/templates" className={navLinkClass}>
                Шаблони
              </NavLink>
              <NavLink to="/attempts" className={navLinkClass}>
                Спроби
              </NavLink>
              <NavLink to="/mentor" className={navLinkClass}>
                Ментор
              </NavLink>
            </nav>
          )}
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10 border border-black/10">
                  <AvatarFallback className="text-xs bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))] font-semibold">
                    {getInitials(user?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground hidden sm:inline">
                  {user?.full_name}
                </span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Вийти
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Увійти</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Реєстрація</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
