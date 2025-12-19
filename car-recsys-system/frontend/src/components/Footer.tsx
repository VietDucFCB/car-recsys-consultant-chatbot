'use client';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">About CarMarket</h3>
            <p className="text-sm text-gray-500">
              Vietnam's leading online car marketplace
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Buy Cars</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/search?condition=new" className="text-gray-500 hover:text-gray-800 transition-colors">New Cars</a></li>
              <li><a href="/search?condition=used" className="text-gray-500 hover:text-gray-800 transition-colors">Used Cars</a></li>
              <li><a href="/compare" className="text-gray-500 hover:text-gray-800 transition-colors">Compare Cars</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/help" className="text-gray-500 hover:text-gray-800 transition-colors">Help</a></li>
              <li><a href="/contact" className="text-gray-500 hover:text-gray-800 transition-colors">Contact</a></li>
              <li><a href="/terms" className="text-gray-500 hover:text-gray-800 transition-colors">Terms</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>Email: support@carmarket.vn</li>
              <li>Hotline: 1900 xxxx</li>
              <li>Business Hours: 8:00 AM - 10:00 PM</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-500">
          © 2024 CarMarket. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
