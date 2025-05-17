import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bold, Italic, List, ListOrdered, Link2, Smile, MoreHorizontal, ChevronRight, Plus } from "lucide-react";
const QATab: React.FC = () => {
  // Mock data for Q&A items
  const qaItems = [{
    id: "1",
    title: "Hva er nummeret?",
    questions: 1,
    size: "199 B"
  }, {
    id: "2",
    title: "Endre bordreservasjon?",
    questions: 1,
    size: "313 B"
  }, {
    id: "3",
    title: "kan jeg ta med hunden min?",
    questions: 1,
    size: "58 B"
  }, {
    id: "4",
    title: "Hei. Så at deres sted var på Quizforbund sik nettside...",
    questions: 1,
    size: "163 B"
  }, {
    id: "5",
    title: "hva er organisasjonsnummeret deres fra Brønnøysund-regist...",
    questions: 1,
    size: "92 B"
  }, {
    id: "6",
    title: "Hva koster billettene?",
    questions: 1,
    size: "238 B"
  }, {
    id: "7",
    title: "Hva med kulturkrasj?",
    questions: 1,
    size: "359 B"
  }];
  return <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Add Q&A</h2>
      </div>

      <div className="space-y-4">
        <div>
          
        </div>

        <Card className="border border-gray-200 p-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="qa-title" className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <Input id="qa-title" placeholder="Ex: Refund requests" className="w-full" />
            </div>

            <div>
              <label htmlFor="qa-question" className="block text-sm font-medium text-gray-700 mb-1">
                Question
              </label>
              <Input id="qa-question" placeholder="Ex: How do I request a refund?" className="w-full" />
            </div>

            <div className="flex items-center text-indigo-600 mb-2">
              <Plus size={16} className="mr-1" />
              <button className="text-sm font-medium">Add another question</button>
            </div>

            <div>
              <label htmlFor="qa-answer" className="block text-sm font-medium text-gray-700 mb-1">
                Answer
              </label>
              <Card className="border border-gray-200">
                <CardContent className="p-0">
                  <div className="flex items-center p-2 border-b border-gray-200">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Bold size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Italic size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ListOrdered size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <List size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Link2 size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Smile size={16} />
                    </Button>
                    <div className="ml-auto text-xs text-gray-400">0 B</div>
                  </div>
                  <Textarea id="qa-answer" placeholder="Enter your answer..." className="border-0 focus-visible:ring-0 min-h-[150px]" />
                </CardContent>
              </Card>
            </div>

            <div className="text-right">
              <Button className="bg-gray-800 hover:bg-gray-700">
                Add Q&A
              </Button>
            </div>
          </div>
        </Card>

        {qaItems.length > 0 && <div>
            <h3 className="text-lg font-medium mb-3">Q&A sources</h3>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Title</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qaItems.map(item => <TableRow key={item.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 mr-3 bg-gray-200 text-gray-600 rounded-full p-1">
                          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        </div>
                        {item.title}
                      </div>
                    </TableCell>
                    <TableCell>{item.questions} questions</TableCell>
                    <TableCell className="text-right">{item.size}</TableCell>
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
                  </TableRow>)}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between mt-4 text-sm">
              <div>
                Rows per page: 
                <select className="ml-2 px-2 py-1 border rounded">
                  <option>20</option>
                </select>
              </div>
              <div className="flex items-center">
                <span className="mr-4">Page 1 of 1</span>
                <div className="flex space-x-1">
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="11 17 6 12 11 7" />
                      <polyline points="18 17 13 12 18 7" />
                    </svg>
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="13 17 18 12 13 7" />
                      <polyline points="6 17 11 12 6 7" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </div>}
      </div>
    </div>;
};
export default QATab;