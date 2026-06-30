import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { HugeiconsIcon } from "@hugeicons/react";
import { ListViewIcon } from "@hugeicons/core-free-icons";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Waiter Amountwise — scaffold page (report logic to be implemented).
export default function WaiterAmountwise() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["report", "get_waiter_amountwise"],
    queryFn: () => invoke("get_waiter_amountwise"),
  });

  return (
    <div className="p-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={ListViewIcon} size={20} strokeWidth={2} />
            Waiter Amountwise
          </CardTitle>
          <CardDescription>Report scaffold — connection check</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-5 w-72" />
          ) : error ? (
            <p className="text-sm text-destructive">Backend not connected: {String(error)}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{data}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
