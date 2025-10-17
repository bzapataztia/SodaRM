import { useState, useEffect } from "react";
import Uppy from "@uppy/core";
import { Dashboard } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";

import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";

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
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxFileSize,
        allowedFileTypes,
        maxNumberOfFiles: 1,
      },
      autoProceed: false,
    }).use(AwsS3, {
      async getUploadParameters(file) {
        const response = await fetch("/api/object-storage/upload-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { url, method, headers } = await response.json();

        return {
          method,
          url,
          headers,
        };
      },
    })
  );

  useEffect(() => {
    uppy.on("complete", (result) => {
      if (result.successful && result.successful.length > 0) {
        const uploadedFile = result.successful[0];
        const uploadUrl = uploadedFile.uploadURL;
        
        if (uploadUrl) {
          // Normalize the path to /objects/... format
          fetch("/api/object-storage/normalize-path", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ rawPath: uploadUrl }),
          })
            .then((res) => res.json())
            .then((data) => {
              onUploadComplete(data.normalizedPath);
              uppy.cancelAll();
            })
            .catch((error) => {
              console.error("Error normalizing path:", error);
              if (onUploadError) {
                onUploadError(error);
              }
            });
        }
      }
    });

    uppy.on("error", (error) => {
      console.error("Upload error:", error);
      if (onUploadError) {
        onUploadError(error);
      }
    });

    return () => {
      uppy.close();
    };
  }, [uppy, onUploadComplete, onUploadError]);

  return (
    <div className="object-uploader">
      <Dashboard
        uppy={uppy}
        proudlyDisplayPoweredByUppy={false}
        note={note}
        height={350}
      />
    </div>
  );
}
