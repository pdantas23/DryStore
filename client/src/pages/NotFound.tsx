import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-8 text-center shadow-lg">

        <div className="mb-6 flex justify-center">
          <div className="h-16 w-16 animate-pulse rounded-full bg-red-100" />
        </div>

        <h1 className="mb-2 text-4xl font-bold text-slate-900">404</h1>

        <h2 className="mb-4 text-xl font-semibold text-slate-700">
          Página não encontrada
        </h2>

        <p className="mb-8 leading-relaxed text-slate-600">
          A página que você está procurando não existe ou foi removida.
        </p>

        <button
          onClick={() => setLocation("/")}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-white shadow-md transition-all duration-200 hover:bg-blue-700 hover:shadow-lg"
        >
          Voltar ao início
        </button>
      </div>
    </div>
  );
}
