import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { HugeiconsIcon } from "@hugeicons/react";
import { ListViewIcon } from "@hugeicons/core-free-icons";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Captainwise Item Details — scaffold page (report logic to be implemented).
export default function CaptainwiseItemDetails() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["report", "get_captainwise_item_details"],
    queryFn: () => invoke("get_captainwise_item_details"),
  });

  return (
    <div className="p-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={ListViewIcon} size={20} strokeWidth={2} />
            Captainwise Item Details
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
