
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, CreditCard } from "lucide-react";

const BillingSettings = () => {
  return (
    <div className="space-y-8">
      {/* Billing details section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Billing details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="org-name" className="block text-sm font-medium mb-1">
              Organization name
            </label>
            <Input 
              id="org-name"
              placeholder="Wonderwave AS"
              defaultValue="Wonderwave AS"
              className="max-w-xl"
            />
          </div>
          
          <div>
            <label htmlFor="country" className="block text-sm font-medium mb-1">
              Country or region
            </label>
            <div className="relative max-w-xl">
              <select 
                id="country" 
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm appearance-none pr-10"
                defaultValue="Norway"
              >
                <option value="Norway">Norway</option>
                <option value="Sweden">Sweden</option>
                <option value="Denmark">Denmark</option>
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50" />
            </div>
          </div>
          
          <div>
            <label htmlFor="address1" className="block text-sm font-medium mb-1">
              Address line 1
            </label>
            <Input 
              id="address1"
              placeholder="Osloveien 8"
              defaultValue="Osloveien 8"
              className="max-w-xl"
            />
          </div>
          
          <div>
            <label htmlFor="address2" className="block text-sm font-medium mb-1">
              Address line 2
            </label>
            <Input 
              id="address2"
              placeholder="Apt, suite, unit number, etc. (optional)"
              className="max-w-xl"
            />
          </div>
          
          <div>
            <label htmlFor="postal" className="block text-sm font-medium mb-1">
              Postal code
            </label>
            <Input 
              id="postal"
              placeholder="0360"
              defaultValue="0360"
              className="max-w-xl"
            />
          </div>
          
          <div>
            <label htmlFor="city" className="block text-sm font-medium mb-1">
              Town or city
            </label>
            <Input 
              id="city"
              placeholder="Oslo"
              defaultValue="Oslo"
              className="max-w-xl"
            />
          </div>
          
          <div className="flex justify-end pt-3">
            <Button>Save</Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing email section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Billing email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Email used for invoices.</p>
          <Input 
            placeholder="nolman@wonderwave.io"
            defaultValue="nolman@wonderwave.io"
            className="max-w-xl"
          />
          <div className="flex justify-end pt-3">
            <Button>Save</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tax ID section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Tax ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">If you want your upcoming invoices to display a specific tax ID, please enter it here.</p>
          
          <div>
            <label htmlFor="tax-type" className="block text-sm font-medium mb-1">
              Tax type
            </label>
            <div className="relative max-w-xl">
              <select 
                id="tax-type" 
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm appearance-none pr-10"
                defaultValue="Norway - NO VAT"
              >
                <option value="Norway - NO VAT">Norway - NO VAT</option>
                <option value="Norway - VAT">Norway - VAT</option>
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50" />
            </div>
          </div>
          
          <div>
            <label htmlFor="tax-id" className="block text-sm font-medium mb-1">
              ID
            </label>
            <Input 
              id="tax-id"
              placeholder="929635456MVA"
              defaultValue="929635456MVA"
              className="max-w-xl"
            />
          </div>
          
          <div className="flex justify-end pt-3">
            <Button>Save</Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing method section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Billing method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Number (Last 4)</TableHead>
                <TableHead>Exp. Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Visa</span>
                    <span className="text-xs bg-accent px-2 py-1 rounded-sm">Default</span>
                  </div>
                </TableCell>
                <TableCell>••••9474</TableCell>
                <TableCell>11/2025</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                      <path d="M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1.5 7C1.22386 7 1 7.22386 1 7.5C1 7.77614 1.22386 8 1.5 8H13.5C13.7761 8 14 7.77614 14 7.5C14 7.22386 13.7761 7 13.5 7H1.5ZM1.5 11C1.22386 11 1 11.2239 1 11.5C1 11.7761 1.22386 12 1.5 12H13.5C13.7761 12 14 11.7761 14 11.5C14 11.2239 13.7761 11 13.5 11H1.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                    </svg>
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Visa</span>
                  </div>
                </TableCell>
                <TableCell>••••9474</TableCell>
                <TableCell>11/2025</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                      <path d="M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1.5 7C1.22386 7 1 7.22386 1 7.5C1 7.77614 1.22386 8 1.5 8H13.5C13.7761 8 14 7.77614 14 7.5C14 7.22386 13.7761 7 13.5 7H1.5ZM1.5 11C1.22386 11 1 11.2239 1 11.5C1 11.7761 1.22386 12 1.5 12H13.5C13.7761 12 14 11.7761 14 11.5C14 11.2239 13.7761 11 13.5 11H1.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                    </svg>
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Visa</span>
                  </div>
                </TableCell>
                <TableCell>••••9474</TableCell>
                <TableCell>11/2025</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                      <path d="M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1.5 7C1.22386 7 1 7.22386 1 7.5C1 7.77614 1.22386 8 1.5 8H13.5C13.7761 8 14 7.77614 14 7.5C14 7.22386 13.7761 7 13.5 7H1.5ZM1.5 11C1.22386 11 1 11.2239 1 11.5C1 11.7761 1.22386 12 1.5 12H13.5C13.7761 12 14 11.7761 14 11.5C14 11.2239 13.7761 11 13.5 11H1.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                    </svg>
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    LINK: Nolman@Wonderwave.io
                  </div>
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                      <path d="M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1.5 7C1.22386 7 1 7.22386 1 7.5C1 7.77614 1.22386 8 1.5 8H13.5C13.7761 8 14 7.77614 14 7.5C14 7.22386 13.7761 7 13.5 7H1.5ZM1.5 11C1.22386 11 1 11.2239 1 11.5C1 11.7761 1.22386 12 1.5 12H13.5C13.7761 12 14 11.7761 14 11.5C14 11.2239 13.7761 11 13.5 11H1.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                    </svg>
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          
          <div className="flex justify-end pt-3">
            <Button>Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing history section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Billing history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium"></TableCell>
                <TableCell>May 09, 2025</TableCell>
                <TableCell>$21.00</TableCell>
                <TableCell></TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">Pay Invoice →</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">SF380030-0018</TableCell>
                <TableCell>May 08, 2025</TableCell>
                <TableCell>$19.00</TableCell>
                <TableCell>
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Due</span>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">Pay Invoice →</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">SF380030-0017</TableCell>
                <TableCell>May 08, 2025</TableCell>
                <TableCell>$19.50</TableCell>
                <TableCell>
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Due</span>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">Pay Invoice →</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">SF380030-0016</TableCell>
                <TableCell>Apr 09, 2025</TableCell>
                <TableCell>$21.00</TableCell>
                <TableCell>
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Due</span>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">Pay Invoice →</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">SF380030-0015</TableCell>
                <TableCell>Apr 08, 2025</TableCell>
                <TableCell>$19.00</TableCell>
                <TableCell>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Paid</span>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">View Invoice →</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          
          <div className="flex justify-center pt-3">
            <Button variant="outline">Load more</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingSettings;
