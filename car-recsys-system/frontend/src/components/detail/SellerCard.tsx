/** Full seller card: name + rating, address, phone, website, sales/service hours, highlights. */
import { Star, MapPin, Phone, Globe, Clock } from "lucide-react";
import type { Seller } from "@/lib/api";

const SellerCard = ({ seller }: { seller: Seller }) => (
  <div className="bg-card border border-border rounded-xl p-6">
    <div className="flex items-center justify-between mb-4">
      <p className="font-semibold text-foreground text-lg">{seller.seller_name || "Dealer"}</p>
      {seller.seller_rating != null && (
        <span className="flex items-center gap-1 text-sm">
          <Star className="h-4 w-4 text-[#A87601] fill-[#A87601]" />
          {seller.seller_rating.toFixed(1)}
          {seller.seller_rating_count != null && (
            <span className="text-muted-foreground">({seller.seller_rating_count})</span>
          )}
        </span>
      )}
    </div>
    <div className="space-y-2 text-sm text-muted-foreground">
      {seller.seller_address && (
        <p className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />{seller.seller_address}</p>
      )}
      {seller.seller_phone && (
        <p className="flex items-center gap-2">
          <Phone className="h-4 w-4 flex-shrink-0" />
          <a href={`tel:${seller.seller_phone}`} className="hover:text-accent">{seller.seller_phone}</a>
        </p>
      )}
      {seller.seller_website && (
        <p className="flex items-center gap-2">
          <Globe className="h-4 w-4 flex-shrink-0" />
          <a href={seller.seller_website} target="_blank" rel="noreferrer" className="hover:text-accent truncate">Dealer website</a>
        </p>
      )}
      {seller.hours_sales && (
        <p className="flex items-center gap-2"><Clock className="h-4 w-4 flex-shrink-0" />Sales: {seller.hours_sales}</p>
      )}
      {seller.hours_service && (
        <p className="flex items-center gap-2"><Clock className="h-4 w-4 flex-shrink-0" />Service: {seller.hours_service}</p>
      )}
    </div>
    {seller.highlights && seller.highlights.length > 0 && (
      <div className="flex flex-wrap gap-2 mt-4">
        {seller.highlights.map((h) => (
          <span key={h} className="text-xs rounded-full bg-accent/10 text-accent border border-accent/20 px-2.5 py-1">{h}</span>
        ))}
      </div>
    )}
  </div>
);

export default SellerCard;
