"use client";

import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { useState } from "react";

interface BonDeCaisseButtonProps extends React.ComponentProps<typeof Button> {
  requestId: string;
  requestTitle?: string;
}

export function BonDeCaisseButton({
  requestId,
  requestTitle = "demande",
  className = "",
  children,
  ...props
}: BonDeCaisseButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePDF = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent bubbling if used inside a clickable card
    e.stopPropagation();

    if (props.onClick) {
      props.onClick(e);
    }

    try {
      setIsGenerating(true);

      // Call the API endpoint to generate the PDF
      const response = await fetch(`/api/bon-de-caisse/${requestId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to generate bon de caisse");
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bon-de-caisse-${requestId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("Bon de caisse generated successfully");
    } catch (error) {
      console.error("Error generating bon de caisse:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Erreur lors de la génération du bon de caisse"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      {...props}
      onClick={handleGeneratePDF}
      disabled={props.disabled || isGenerating}
      className={className}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : children ? (
        children
      ) : (
        <>
          <FileText className="h-4 w-4 mr-2" />
          Générer Bon de Caisse
        </>
      )}
    </Button>
  );
}
