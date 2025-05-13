
import React, { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Map } from "lucide-react";
import { scaleLinear } from "d3-scale";

// Demo data for visualization
const countryData = [
  { country: "United States", countryCode: "USA", coordinates: [-95.7129, 37.0902], chats: 27 },
  { country: "Norway", countryCode: "NOR", coordinates: [8.4689, 60.4720], chats: 16 },
  { country: "Germany", countryCode: "DEU", coordinates: [10.4515, 51.1657], chats: 14 },
  { country: "Japan", countryCode: "JPN", coordinates: [138.2529, 36.2048], chats: 9 },
  { country: "Brazil", countryCode: "BRA", coordinates: [-51.9253, -14.2350], chats: 5 },
  { country: "India", countryCode: "IND", coordinates: [78.9629, 20.5937], chats: 3 },
];

// Scale for marker size based on chat count
const chatScale = scaleLinear()
  .domain([0, Math.max(...countryData.map(d => d.chats))])
  .range([5, 20]);

const ChatsMapChart: React.FC = () => {
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // We'll use a static placeholder for now as the map component is having issues
  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-6">Chats by country</h2>
        
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-2/3 h-[300px] mb-4 lg:mb-0 lg:mr-4 rounded-lg overflow-hidden bg-gray-50">
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Map className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">World map visualization</p>
                <p className="text-xs text-gray-400 mt-1">Geographic distribution of chat activity</p>
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
                {countryData.map((item) => (
                  <TableRow key={item.countryCode}>
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

export default memo(ChatsMapChart);
