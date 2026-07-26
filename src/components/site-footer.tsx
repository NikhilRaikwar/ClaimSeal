export function SiteFooter() {
  return (
    <footer className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 mt-16 sm:mt-24 pb-10 sm:pb-12 pt-10 sm:pt-12 border-t border-stone-200">
      <div className="flex flex-col md:flex-row justify-between gap-5 sm:gap-6 text-xs sm:text-sm text-stone-500">
        <p>&copy; {new Date().getFullYear()} ClaimSeal &middot; Issuer-signed campaign records</p>
        <p className="max-w-md text-xs">
          ClaimSeal verifies an issuer-signed campaign record. It does not audit a smart contract or
          guarantee that a campaign is safe.
        </p>
      </div>
    </footer>
  );
}
