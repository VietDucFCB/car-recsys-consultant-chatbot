import { Menu, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import ThemeToggle from "./ThemeToggle";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/search", label: "Inventory" },
    { href: "/sell", label: "Sell" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "glass-dark shadow-soft py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between gap-4">
        {/* Left section */}
        <div className="flex items-center gap-8">
          {/* Mobile menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-foreground hover:text-accent">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-background border-border">
              <SheetHeader>
                <SheetTitle className="font-heading text-2xl tracking-wide">
                  Car<span className="text-accent">Market</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-10 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`text-base py-3 px-4 rounded-sm transition-all ${
                      isActive(link.href)
                        ? "bg-accent/10 text-accent font-medium"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-1">
            <span className="font-heading text-2xl font-medium text-foreground tracking-wide">
              Car<span className="text-accent">Market</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.slice(1).map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-4 py-2 text-sm tracking-wide transition-all ${
                  isActive(link.href)
                    ? "text-accent"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-md">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
            <Input
              type="text"
              placeholder="Search by make, model, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 h-11 bg-secondary/60 border-border/30 rounded-sm focus:border-accent focus:ring-accent/20 transition-all placeholder:text-muted-foreground/60"
            />
          </div>
        </form>

        {/* Right section */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            to="/sell"
            className="hidden md:block text-sm tracking-wide text-muted-foreground hover:text-accent transition-colors"
          >
            List Your Car
          </Link>
          <Link to="/login">
            <Button className="font-body font-medium tracking-wide bg-accent hover:bg-champagne-dark text-accent-foreground px-6 rounded-sm shadow-soft hover:shadow-elegant transition-all">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
