"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Pencil as EditIcon } from "lucide-react";

interface ExecutiveSummaryProps {
  summary: string;
  onSave?: (summary: string) => Promise<void>;
  isEditable?: boolean;
}

export default function ExecutiveSummary({
  summary,
  onSave,
  isEditable = true,
}: ExecutiveSummaryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(summary);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setText(summary);
  }, [summary]);

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(text);
        setIsEditing(false);
      } catch (error) {
        console.error("Failed to save executive summary:", error);
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setText(summary);
    setIsEditing(false);
  };

  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Executive Summary</h3>
          {isEditable && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title="Edit"
            >
              <EditIcon className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full min-h-[150px] p-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-y"
              placeholder="Enter executive summary..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm text-white bg-zinc-900 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-700 whitespace-pre-wrap min-h-[100px]">
            {text || (
              <span className="text-gray-400 italic">
                No executive summary provided. Click edit to add one.
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
