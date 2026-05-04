export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-white"
    >
      <img src="/logo.png" alt="Dry Store" className="h-14 w-14 object-contain" />
      <div className="h-8 w-8 rounded-full border-2 border-[#C2A96B]/20 border-t-[#C2A96B] animate-spin" />
    </div>
  );
}
