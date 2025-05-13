
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { FileUp, MoreHorizontal, ChevronRight } from "lucide-react";

const FilesTab: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Here you would handle the file upload
    toast({
      title: "Files received",
      description: "Your files would be processed here",
    });
  };

  const handleFileUpload = () => {
    // Simulate file selection dialog
    toast({
      title: "File selection",
      description: "File selection dialog would open here",
    });
  };

  // Mock data for files
  const files = [
    { id: "1", name: "Presentasjon og prisoversikt_2025.pdf", size: "4 KB", type: "PDF" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Files</h2>
        <div className="text-right">
          <div className="text-sm text-gray-500 mb-1">Total size: 65 KB / 33 MB</div>
          <Button className="bg-black hover:bg-gray-800">
            Retrain agent
          </Button>
        </div>
      </div>

      <Card
        className={`border border-dashed ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        } rounded-lg p-8`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-4">
            <FileUp size={36} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">Drag & drop files here, or click to select files</h3>
          <p className="text-sm text-gray-500 mb-4">Supported File Types: .pdf, .doc, .docx, .txt</p>
          <Button onClick={handleFileUpload} variant="outline">
            Select Files
          </Button>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">File sources</h3>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-3 bg-red-100 text-red-600 rounded px-2 py-1 text-xs font-bold uppercase">
                        {file.type}
                      </div>
                      {file.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{file.size}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal size={18} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight size={18} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default FilesTab;
