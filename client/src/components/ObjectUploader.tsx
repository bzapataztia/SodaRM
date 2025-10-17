import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface ObjectUploaderProps {
  onUploadComplete: (objectPath: string) => void;
  onUploadError?: (error: Error) => void;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  note?: string;
}

export function ObjectUploader({
  onUploadComplete,
  onUploadError,
  maxFileSize = 2 * 1024 * 1024, // 2MB default
  allowedFileTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  note = "Máximo 2MB por imagen. Formatos: JPG, PNG, WebP",
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!allowedFileTypes.includes(file.type)) {
      const error = new Error(`Tipo de archivo no permitido. Use: ${allowedFileTypes.join(", ")}`);
      if (onUploadError) onUploadError(error);
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      const error = new Error(`Archivo muy grande. Máximo ${maxFileSize / (1024 * 1024)}MB`);
      if (onUploadError) onUploadError(error);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);

      // Get upload URL
      const uploadUrlResponse = await fetch("/api/object-storage/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
        }),
      });

      if (!uploadUrlResponse.ok) {
        throw new Error("Error al obtener URL de subida");
      }

      const { url } = await uploadUrlResponse.json();

      // Upload file to storage
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Error al subir archivo");
      }

      // Normalize path
      const normalizeResponse = await fetch("/api/object-storage/normalize-path", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rawPath: url }),
      });

      if (!normalizeResponse.ok) {
        throw new Error("Error al procesar ruta");
      }

      const { normalizedPath } = await normalizeResponse.json();
      
      onUploadComplete(normalizedPath);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      if (onUploadError && error instanceof Error) {
        onUploadError(error);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedFileTypes.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          id="photo-upload"
        />
        <label
          htmlFor="photo-upload"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <Upload className="w-12 h-12 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            <span className="text-primary font-medium">Haz clic para seleccionar</span> o arrastra una imagen
          </div>
          <div className="text-xs text-muted-foreground">{note}</div>
        </label>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
          <div className="text-sm truncate flex-1">
            <div className="font-medium">{selectedFile.name}</div>
            <div className="text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </div>
          </div>
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            size="sm"
          >
            {isUploading ? "Subiendo..." : "Subir"}
          </Button>
        </div>
      )}
    </div>
  );
}
