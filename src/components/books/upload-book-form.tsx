"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { createBookFromUpload } from "@/app/actions/books";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UploadBookForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function upload(nextFile: File) {
    const formData = new FormData();
    formData.set("file", nextFile);
    setPending(true);
    setMessage(null);
    const result = await createBookFromUpload(formData);
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    router.push(`/books/${result.bookId}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (file) void upload(file);
      }}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const dropped = event.dataTransfer.files[0];
          if (!dropped) return;
          setFile(dropped);
          void upload(dropped);
        }}
        className={cn(
          "flex w-full flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-10 text-center transition-colors",
          dragging ? "border-path bg-path-soft" : "hover:bg-path-soft/60",
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-path-soft text-path-ink">
          <FileUp className="size-5" />
        </span>
        <p className="mt-4 font-medium">{pending ? "Читаю книгу…" : "Перетащите файл сюда"}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          FB2, EPUB, PDF или TXT до 30 МБ. Можно нажать и выбрать файл на компьютере.
        </p>
        {file && !pending ? <p className="mt-3 text-sm font-medium">{file.name}</p> : null}
      </button>
      <input
        ref={inputRef}
        name="file"
        type="file"
        accept=".fb2,.epub,.pdf,.txt,application/pdf,application/epub+zip,text/plain"
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (!selected) return;
          setFile(selected);
          void upload(selected);
        }}
      />
      {message ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-destructive">{message}</p>
          {file ? (
            <Button type="submit" variant="outline">
              Повторить
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
