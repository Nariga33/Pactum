"use client";

import { useActionState, useRef, useState } from "react";
import { updateProfile, type UpdateProfileState } from "@/lib/actions/profile";
import { Avatar } from "@/components/avatar";

const initialState: UpdateProfileState = {};
const AVATAR_SIZE_PX = 256;

function loadImage(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const element = new window.Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    element.src = objectUrl;
  });
}

async function resizeToSquareDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = (image.naturalWidth - side) / 2;
    const sy = (image.naturalHeight - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE_PX;
    canvas.height = AVATAR_SIZE_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D não suportado.");
    ctx.drawImage(image, sx, sy, side, side, 0, 0, AVATAR_SIZE_PX, AVATAR_SIZE_PX);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function ProfileForm({
  name: initialName,
  email,
  phone: initialPhone,
  title: initialTitle,
  image: initialImage,
}: {
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  image: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const [imageDataUrl, setImageDataUrl] = useState(initialImage ?? "");
  const [previewName, setPreviewName] = useState(initialName);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Escolha um arquivo de imagem.");
      return;
    }

    try {
      setImageError(null);
      setImageDataUrl(await resizeToSquareDataUrl(file));
    } catch {
      setImageError("Não foi possível processar essa imagem.");
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar name={previewName || "?"} image={imageDataUrl || null} size="lg" />
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Alterar foto
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {imageError && <p className="mt-1 text-xs text-red-600">{imageError}</p>}
        </div>
      </div>
      <input type="hidden" name="image" value={imageDataUrl} />

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-neutral-700">
          Nome
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initialName}
          onChange={(event) => setPreviewName(event.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-700">E-mail</label>
        <input
          value={email}
          disabled
          className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium text-neutral-700">
          Cargo
        </label>
        <input
          id="title"
          name="title"
          defaultValue={initialTitle ?? ""}
          placeholder="Ex: Advogado(a) associado(a)"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm font-medium text-neutral-700">
          Telefone
        </label>
        <input
          id="phone"
          name="phone"
          defaultValue={initialPhone ?? ""}
          placeholder="(11) 91234-5678"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Perfil atualizado.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
