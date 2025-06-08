
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Download } from "lucide-react";

const BillingSettings = () => {
  const invoices = [
    {
      id: "INV-001",
      date: "2024-01-01",
      amount: "$29.00",
      status: "Paid",
      period: "Jan 2024"
    },
    {
      id: "INV-002",
      date: "2024-02-01",
      amount: "$29.00",
      status: "Paid",
      period: "Feb 2024"
    },
    {
      id: "INV-003",
      date: "2024-03-01",
      amount: "$29.00",
      status: "Pending",
      period: "Mar 2024"
    }
  ];

  return (
    <div className="bg-white rounded-lg border p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-6">Billing</h2>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard size={20} />
            Payment Method
          </CardTitle>
          <CardDescription>
            Manage your payment information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-6 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">
                VISA
              </div>
              <div>
                <p className="font-medium">•••• •••• •••• 4242</p>
                <p className="text-sm text-gray-500">Expires 12/25</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            Download your invoices and view payment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-medium">{invoice.id}</p>
                    <Badge variant={invoice.status === 'Paid' ? 'default' : 'secondary'}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{invoice.period}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{invoice.amount}</span>
                  <Button variant="outline" size="sm">
                    <Download size={14} className="mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingSettings;
