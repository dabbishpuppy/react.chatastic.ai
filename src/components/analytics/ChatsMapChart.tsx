
import React, { memo, useState, useEffect } from "react";
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
  const [mapComponents, setMapComponents] = useState<{
    ComposableMap: any;
    Geographies: any;
    Geography: any;
    Marker: any;
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dynamically import react-simple-maps
    import("react-simple-maps")
      .then(({ ComposableMap, Geographies, Geography, Marker }) => {
        setMapComponents({ ComposableMap, Geographies, Geography, Marker });
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load react-simple-maps:", error);
        setIsLoading(false);
      });
  }, []);

  // URL to a world map topojson file
  const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-6">Chats by country</h2>
        
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-2/3 h-[300px] mb-4 lg:mb-0 lg:mr-4 rounded-lg overflow-hidden bg-gray-50">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Map className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Loading map...</p>
                </div>
              </div>
            ) : mapComponents ? (
              <mapComponents.ComposableMap
                projection="geoEqualEarth"
                projectionConfig={{
                  scale: 140,
                }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              >
                <mapComponents.Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map(geo => (
                      <mapComponents.Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#EAEAEC"
                        stroke="#D6D6DA"
                        style={{
                          default: { outline: "none" },
                          hover: { fill: "#F5F5F5", outline: "none" },
                          pressed: { fill: "#E6E6E6", outline: "none" },
                        }}
                      />
                    ))
                  }
                </mapComponents.Geographies>
                {countryData.map(({ countryCode, coordinates, chats }) => (
                  <mapComponents.Marker key={countryCode} coordinates={coordinates as [number, number]}>
                    <circle
                      r={chatScale(chats)}
                      fill="#8A63D2"
                      fillOpacity={0.7}
                      stroke="#FFFFFF"
                      strokeWidth={1}
                    />
                  </mapComponents.Marker>
                ))}
              </mapComponents.ComposableMap>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Map className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Could not load map visualization.</p>
                  <p className="text-xs text-gray-400 mt-1">Please check the console for details.</p>
                </div>
              </div>
            )}
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
