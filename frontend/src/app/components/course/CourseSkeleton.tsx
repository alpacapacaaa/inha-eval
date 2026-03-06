import { Skeleton } from "../ui/skeleton";
import { Card, CardContent } from "../ui/card";

export function CourseCardSkeleton() {
    return (
        <Card className="border-gray-100 shadow-sm">
            <CardContent className="p-4">
                <div className="space-y-3">
                    <div>
                        <Skeleton className="h-6 w-[60%] mb-2" />
                        <Skeleton className="h-4 w-[80%]" />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="w-4 h-4 rounded-full" />
                            ))}
                        </div>
                        <Skeleton className="h-4 w-8" />
                        <Skeleton className="h-4 w-16" />
                    </div>

                    <div className="flex gap-2">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function CourseDetailSkeleton() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="relative overflow-hidden bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-6 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80">
                <div className="flex flex-col md:flex-row gap-8 lg:gap-14">
                    <div className="flex-1 space-y-8">
                        <div>
                            <Skeleton className="h-10 w-[70%] mb-4" />
                            <div className="flex gap-2">
                                <Skeleton className="h-6 w-16" />
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-6 w-20" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <div className="flex items-end gap-2">
                                <Skeleton className="h-14 w-20" />
                                <Skeleton className="h-6 w-12" />
                            </div>
                            <div className="flex gap-1 mt-2">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="w-5 h-5 rounded-full" />
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3 pt-4">
                            <Skeleton className="h-12 w-full rounded-xl" />
                            <Skeleton className="h-12 w-full rounded-xl" />
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center py-4">
                        <Skeleton className="w-[260px] h-[260px] rounded-full" />
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <ReviewCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

export function ReviewCardSkeleton() {
    return (
        <Card className="border-gray-100 shadow-sm">
            <CardContent className="p-6">
                <div className="space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-12" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                            <Skeleton className="h-6 w-32 rounded-full" />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="w-4 h-4 rounded-full" />
                                ))}
                            </div>
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-6 w-16 rounded-md" />
                        ))}
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[80%]" />
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <Skeleton className="h-8 w-24 rounded-lg" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
