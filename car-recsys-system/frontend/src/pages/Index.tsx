import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import PopularCategories from "@/components/PopularCategories";
import FeaturedVehicles from "@/components/FeaturedVehicles";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>CarMarket - Luxury Cars for Sale | Find Your Dream Car</title>
        <meta
          name="description"
          content="Explore our curated collection of luxury vehicles, supercars, and exotic automobiles. Find your dream car from trusted sellers worldwide."
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <Hero />
          <PopularCategories />
          <FeaturedVehicles />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
