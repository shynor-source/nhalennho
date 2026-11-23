"use client";

import ImageExtension from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { uploadProductImage } from "@/lib/api-client";
import { mediaUrl } from "@/lib/media";

type Props = {
  /** Stored HTML for edit mode; empty for a new post. */
  initialContent: string;
  /** Called with the current HTML on every change (including init). */
  onChange: (html: string) => void;
};

const toolbarBtn =
  "inline-flex size-9 items-center justify-center rounded-control text-muted transition-colors hover:bg-blush/60 hover:text-rose-deep disabled:cursor-not-allowed disabled:opacity-40";

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${toolbarBtn} ${active ? "bg-blush text-rose-deep" : ""}`}
    >
      {children}
    </button>
  );
}

const Divider = () => (
  <span aria-hidden="true" className="mx-1 h-6 w-px bg-line" />
);

async function uploadImage(file: File): Promise<string | null> {
  const res = await uploadProductImage(file);
  if (!res.ok) return null;
  return mediaUrl(res.data.url);
}

/**
 * Word-like rich text editor for post content, built on Tiptap (ProseMirror).
 * Supports headings, bold/italic/strike, lists, text alignment, undo/redo,
 * and inline images inserted exactly at the caret — either pasted from the
 * clipboard, dropped from the desktop, or picked via the image button. Images
 * are uploaded to the media store immediately; only the resulting URL is kept
 * in the HTML.
 */
export function RichTextEditor({ initialContent, onChange }: Props) {
  const [uploading, setUploading] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busyCount = useRef(0);
  const editorRef = useRef<Editor | null>(null);

  function setUploadingCount(delta: number) {
    busyCount.current = Math.max(0, busyCount.current + delta);
    setUploading(busyCount.current);
  }

  async function insertImageFiles(files: File[]) {
    const editor = editorRef.current;
    if (!editor) return;
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      setUploadingCount(1);
      const src = await uploadImage(file);
      setUploadingCount(-1);
      if (src) editor.chain().focus().setImage({ src }).run();
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      ImageExtension.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ["heading", "paragraph", "image"] }),
    ],
    content: initialContent || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "rich-editor-content min-h-72 rounded-control border border-line bg-white px-4 py-3 text-sm leading-relaxed text-ink focus:outline-none",
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length === 0 || !editorRef.current) return false;
        event.preventDefault();
        void insertImageFiles(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (files.length === 0 || !editorRef.current) return false;
        event.preventDefault();
        void insertImageFiles(files);
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.isEmpty ? "" : e.getHTML());
    },
    onCreate: ({ editor: e }) => {
      // Report the initial HTML once so a save without further typing works.
      if (!e.isEmpty) onChange(e.getHTML());
    },
  });

  // Keep the latest editor reachable from event-handler closures without
  // touching refs during render.
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  if (!editor) {
    return (
      <div className="min-h-72 animate-pulse rounded-control border border-line bg-white" />
    );
  }

  return (
    <div>
      <div
        role="toolbar"
        aria-label="Thanh công cụ soạn thảo"
        className="flex flex-wrap items-center gap-0.5 rounded-t-control border border-b-0 border-line bg-cream/80 px-2 py-1.5"
      >
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          label="In đậm"
        >
          <Bold aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          label="In nghiêng"
        >
          <Italic aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          label="Gạch ngang"
        >
          <Strikethrough aria-hidden="true" className="size-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
          label="Tiêu đề lớn"
        >
          <Heading2 aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
          label="Tiêu đề nhỏ"
        >
          <Heading3 aria-hidden="true" className="size-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          label="Danh sách chấm"
        >
          <List aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          label="Danh sách số"
        >
          <ListOrdered aria-hidden="true" className="size-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          label="Căn trái"
        >
          <AlignLeft aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          label="Căn giữa"
        >
          <AlignCenter aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          label="Căn phải"
        >
          <AlignRight aria-hidden="true" className="size-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading > 0}
          label="Chèn ảnh (chọn file)"
        >
          <ImagePlus aria-hidden="true" className="size-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          label="Hoàn tác"
        >
          <Undo2 aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          label="Làm lại"
        >
          <Redo2 aria-hidden="true" className="size-4" />
        </ToolbarButton>

        {uploading > 0 ? (
          <span className="ml-2 text-xs text-muted" role="status">
            Đang tải ảnh lên…
          </span>
        ) : null}
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          await insertImageFiles(files);
        }}
      />
      <p className="mt-1 text-xs text-muted">
        Dán (Ctrl+V) hoặc kéo thả ảnh thẳng vào ô soạn thảo, hoặc bấm nút ảnh
        để chèn ảnh vào vị trí con trỏ.
      </p>
    </div>
  );
}
