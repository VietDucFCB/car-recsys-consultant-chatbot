import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Heart, LogOut, Mail, Phone, User as UserIcon, CalendarDays } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { isAuthenticated, getCurrentUser, authApi, type User } from "@/lib/api";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(getCurrentUser());

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    authApi.getMe().then(setUser).catch(() => setUser(getCurrentUser()));
  }, [navigate]);

  const handleLogout = () => {
    authApi.logout();
    navigate("/");
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined,
        { year: "numeric", month: "long", day: "numeric" })
    : null;

  const initial = (user?.username?.[0] ?? "?").toUpperCase();

  return (
    <>
      <Helmet>
        <title>My Profile - Car Recommendation System</title>
        <meta name="description" content="Your account profile" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-3xl px-4 pt-28 pb-16">
          <h1 className="mb-6 text-3xl font-extrabold text-foreground">My Profile</h1>

          {!user ? (
            <p className="text-muted-foreground">Loading your profile…</p>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-6">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-xl font-bold text-foreground">
                    {user.full_name || user.username}
                  </div>
                  <div className="text-sm text-muted-foreground">@{user.username}</div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-6 text-sm">
                <div className="flex items-center gap-3 text-foreground">
                  <Mail className="h-4 w-4 text-muted-foreground" /> {user.email}
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3 text-foreground">
                    <Phone className="h-4 w-4 text-muted-foreground" /> {user.phone}
                  </div>
                )}
                {user.full_name && (
                  <div className="flex items-center gap-3 text-foreground">
                    <UserIcon className="h-4 w-4 text-muted-foreground" /> {user.full_name}
                  </div>
                )}
                {memberSince && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" /> Member since {memberSince}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link to="/favorites">
                    <Heart className="mr-2 h-4 w-4" /> My Favorites
                  </Link>
                </Button>
                <Button variant="destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}
