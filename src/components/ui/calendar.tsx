"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center relative items-center h-10 mb-2",
        caption_label: "text-sm font-bold tracking-tight",
        nav: "flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 bg-muted/30 p-0 rounded-full opacity-60 hover:opacity-100 hover:bg-muted/50 absolute left-0 top-1/2 -translate-y-1/2 transition-all z-10"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 bg-muted/30 p-0 rounded-full opacity-60 hover:opacity-100 hover:bg-muted/50 absolute right-0 top-1/2 -translate-y-1/2 transition-all z-10"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex justify-between mb-2",
        weekday:
          "text-muted-foreground/60 rounded-md w-10 font-bold text-[0.7rem] uppercase tracking-wider text-center",
        week: "flex w-full mt-1 justify-between",
        day: "h-10 w-10 text-center text-sm p-0 relative flex items-center justify-center",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-medium aria-selected:opacity-100 rounded-xl hover:bg-muted/50 transition-all select-none touch-manipulation"
        ),
        range_end: "day-range-end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-lg shadow-primary/20",
        today: "bg-accent/10 text-accent font-bold",
        outside:
          "day-outside text-muted-foreground/40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
