import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/session";
import { deleteFile } from "@/lib/actions/files";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Arquivos — Pactum" };

const ADMIN_ROLES = new Set(["OWNER", "ADMIN"]);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function FilesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const session = await requireTenantSession(tenant);

  const files = await prisma.fileAttachment.findMany({
    where: { organizationId: session.user.organizationId },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const canManage = ADMIN_ROLES.has(session.user.role);

  return (
    <main className="flex-1 overflow-y-auto px-8 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">Arquivos</h1>
      <p className="mt-1 text-neutral-500">Documentos compartilhados do escritório.</p>

      <div className="mt-6 max-w-lg">
        <UploadForm />
      </div>

      <ul className="mt-8 max-w-2xl divide-y divide-neutral-200 rounded-xl border border-neutral-200">
        {files.map((file) => (
          <li key={file.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <a
                href={file.data}
                download={file.name}
                className="truncate text-sm font-medium text-neutral-900 hover:underline"
              >
                {file.name}
              </a>
              <p className="truncate text-xs text-neutral-500">
                {formatSize(file.size)} · enviado por {file.uploadedBy.name} em{" "}
                {file.createdAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
              </p>
            </div>
            {(canManage || file.uploadedById === session.user.id) && (
              <form action={deleteFile.bind(null, file.id)}>
                <button
                  type="submit"
                  className="shrink-0 text-xs text-red-600 underline hover:text-red-800"
                >
                  Excluir
                </button>
              </form>
            )}
          </li>
        ))}
        {files.length === 0 && (
          <li className="px-4 py-6 text-sm text-neutral-400">Nenhum arquivo ainda.</li>
        )}
      </ul>
    </main>
  );
}
