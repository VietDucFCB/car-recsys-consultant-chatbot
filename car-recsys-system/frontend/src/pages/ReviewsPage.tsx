/** Public reviews page (carvago-style): rating header + brand/sort filters + card grid + pagination. */
import { useState } from "react";
import { Star, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAllReviews, useReviewBrands } from "@/hooks/useApi";

const SORTS = [
  { value: "recent", label: "Most recent" },
  { value: "rating_high", label: "Highest rated" },
  { value: "rating_low", label: "Lowest rated" },
] as const;

const ReviewsPage = () => {
  const [brand, setBrand] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "rating_high" | "rating_low">("recent");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { data, isLoading } = useAllReviews({
    brand: brand !== "all" ? brand : undefined,
    sort,
    page,
    page_size: pageSize,
  });
  const { data: brands } = useReviewBrands();

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const avg = data?.avg_rating ?? 0;

  const resetTo1 = (fn: () => void) => { fn(); setPage(1); };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Rating header */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground mb-3">
              What our buyers say
            </h1>
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-6 w-6 ${s <= Math.round(avg) ? "text-[#A87601] fill-[#A87601]" : "text-muted-foreground"}`}
                  />
                ))}
              </div>
              <span className="text-4xl font-bold text-foreground">{avg ? avg.toFixed(1) : "—"}</span>
            </div>
            <p className="text-muted-foreground mt-1">{total.toLocaleString()} reviews</p>
            <p className="text-foreground italic mt-3">"If you're not happy, neither are we!"</p>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            <Select value={brand} onValueChange={(v) => resetTo1(() => setBrand(v))}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All brands" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brands</SelectItem>
                {(brands ?? []).map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => resetTo1(() => setSort(v as typeof sort))}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (data?.items?.length ?? 0) === 0 ? (
            <p className="text-center text-muted-foreground py-20">No reviews found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data!.items.map((r, i) => (
                <ReviewCard key={i} review={r} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-10">
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ReviewsPage;
