import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Image } from "lucide-react";

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
    <div className="space-y-3">
      <div className="relative group">
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
          className="cursor-pointer block"
        >
          <div className="border-2 border-dashed border-primary/30 hover:border-primary/60 rounded-xl p-8 text-center transition-all bg-background/50 hover:bg-primary/5">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  <span className="text-primary">Haz clic para seleccionar</span>
                  <span className="text-muted-foreground"> o arrastra una imagen</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{note}</p>
              </div>
            </div>
          </div>
        </label>
      </div>

      {selectedFile && (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Image className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              size="sm"
              className="flex-shrink-0"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Subir
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
