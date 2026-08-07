import Link from "next/link";

const FEATURES = [
  {
    title: "Workspace dedicado por escritório",
    description:
      "Cada escritório tem seu próprio subdomínio e login isolado — sem misturar dados ou conversas entre organizações.",
  },
  {
    title: "Canais e mensagens diretas",
    description:
      "Comunicação em tempo real por área do escritório (societário, contencioso, trabalhista...), como no Slack.",
  },
  {
    title: "Arquivos sem sair do chat",
    description:
      "Anexe documentos diretamente ou conecte o Google Drive e o SharePoint do escritório para buscar e compartilhar arquivos na conversa.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="text-lg font-semibold tracking-tight">Pactum</span>
        <Link
          href="/signup"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          Criar workspace
        </Link>
      </header>

      <section className="mx-auto flex max-w-3xl flex-1 flex-col items-center px-6 py-16 text-center sm:py-24">
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
          Feito para escritórios de advocacia
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
          A comunicação interna do seu escritório, em um só lugar
        </h1>
        <p className="mt-4 max-w-xl text-lg text-neutral-500">
          Chat em canais, mensagens diretas e arquivos integrados — com um
          workspace próprio e login dedicado para o seu escritório.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Criar o workspace do meu escritório
          </Link>
        </div>

        <div className="mt-20 grid w-full gap-6 text-left sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-neutral-200 p-5">
              <p className="text-sm font-medium text-neutral-900">{feature.title}</p>
              <p className="mt-2 text-sm text-neutral-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 py-6 text-center text-xs text-neutral-400">
        Pactum — comunicação interna para escritórios de advocacia.
      </footer>
    </main>
  );
}
