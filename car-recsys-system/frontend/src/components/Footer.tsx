'use client';

'use client';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">About CarMarket</h3>
            <p className="text-gray-400 text-sm">
              Vietnam's leading online car marketplace
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Buy Cars</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/search?condition=new" className="text-gray-400 hover:text-white">New Cars</a></li>
              <li><a href="/search?condition=used" className="text-gray-400 hover:text-white">Used Cars</a></li>
              <li><a href="/compare" className="text-gray-400 hover:text-white">Compare Cars</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/help" className="text-gray-400 hover:text-white">Help</a></li>
              <li><a href="/contact" className="text-gray-400 hover:text-white">Contact</a></li>
              <li><a href="/terms" className="text-gray-400 hover:text-white">Terms</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Email: support@carmarket.vn</li>
              <li>Hotline: 1900 xxxx</li>
              <li>Business Hours: 8:00 AM - 10:00 PM</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
          © 2024 CarMarket. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
