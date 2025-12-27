import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Car, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

const LoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate authentication
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: isLogin ? "Welcome back!" : "Account created!",
        description: "You have been successfully authenticated.",
      });
      navigate("/");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2 text-foreground group">
            <span className="font-heading text-2xl font-semibold">
              Car<span className="text-accent">Market</span>
            </span>
          </Link>

          {/* Header */}
          <div>
            <h1 className="font-heading text-3xl font-semibold text-foreground mb-2">
              {isLogin ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? "Sign in to access your account"
                : "Start your journey with us today"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" required className="h-12 rounded-xl" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" required className="h-12 rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  className="h-12 rounded-xl pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="text-right">
                <a href="#" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  Forgot password?
                </a>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="+1 555-0123" required className="h-12 rounded-xl" />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-accent hover:bg-gold-dark text-accent-foreground shadow-gold font-medium text-base" 
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-sm text-muted-foreground">
              or continue with
            </span>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-12 rounded-xl" type="button">
              <img
                src="https://www.google.com/favicon.ico"
                alt="Google"
                className="h-5 w-5 mr-2"
              />
              Google
            </Button>
            <Button variant="outline" className="h-12 rounded-xl" type="button">
              <img
                src="https://www.facebook.com/favicon.ico"
                alt="Facebook"
                className="h-5 w-5 mr-2"
              />
              Facebook
            </Button>
          </div>

          {/* Toggle */}
          <p className="text-center text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-accent font-medium hover:underline"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&h=1600&fit=crop&q=80"
          alt="Luxury car"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        
        {/* Content overlay */}
        <div className="absolute bottom-16 left-16 right-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 backdrop-blur-sm border border-accent/30 mb-6">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-sm text-foreground font-medium">
              15,000+ Premium Vehicles
            </span>
          </div>
          <h2 className="font-heading text-4xl font-semibold text-foreground mb-4">
            Discover Your <span className="text-gradient-gold">Dream Car</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-md">
            Join thousands of satisfied buyers and sellers in our premium automotive marketplace.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
