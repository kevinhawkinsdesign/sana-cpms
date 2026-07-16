import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SharedTableSkeletonProps {
  columnCount: number;
  rowCount: number;
}

export const SharedTableSkeleton: React.FC<SharedTableSkeletonProps> = ({ columnCount, rowCount }) => {
  return (
    <>
      <Skeleton className="h-4 w-[200px] mb-4" /> {/* Breadcrumbs skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <Skeleton className="h-8 w-[250px] mb-2" /> {/* Title skeleton */}
          <Skeleton className="h-4 w-[300px]" /> {/* Description skeleton */}
        </div>
        <Skeleton className="h-10 w-[100px]" /> {/* Add button skeleton */}
      </div>
      <Skeleton className="h-[1px] w-full mb-4" /> {/* Separator skeleton */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {Array(columnCount).fill(0).map((_, index) => (
                <TableHead key={index}>
                  <Skeleton className="h-6 w-full" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(rowCount).fill(0).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array(columnCount).fill(0).map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};