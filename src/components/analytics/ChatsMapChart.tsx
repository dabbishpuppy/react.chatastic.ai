
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// We'll use a placeholder for the map chart since implementing a full map
// would require additional libraries like react-simple-maps or mapbox
const ChatsMapChart: React.FC = () => {
  const countryData = [
    { country: "Norway", chats: 1 }
  ];

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-6">Chats by country</h2>
        
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-2/3 h-[300px] bg-slate-100 rounded-lg mb-4 lg:mb-0 lg:mr-4 flex items-center justify-center relative">
            <div className="text-gray-400">
              {/* This would be replaced with an actual map component */}
              <svg className="w-72 h-72 mx-auto opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h2.5a2 2 0 002-2v-1a2 2 0 012-2h1.5a2 2 0 012 2v1a2 2 0 002 2h2.5a2 2 0 002-2v-1a2 2 0 012-2h1.5"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 9l9-6 9 6m-1.5 11.25h.01"></path>
              </svg>
              <div className="absolute inset-0 p-6 flex items-center justify-center">
                <p className="text-lg">World Map Visualization</p>
              </div>
            </div>
          </div>
          
          <div className="lg:w-1/3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Chats</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countryData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.country}</TableCell>
                    <TableCell className="text-right">{item.chats}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="flex justify-center mt-4">
              <Button variant="outline" size="sm" className="text-xs">
                View All
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatsMapChart;
