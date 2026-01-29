"use client";

/**
 * Custom Calendar Toolbar
 * Responsive design for mobile and desktop
 */

import { useMemo, useState } from "react";
import { ToolbarProps, View } from "react-big-calendar";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarEvent } from "@/lib/types/planner";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Generate month options
const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const MONTHS_SHORT = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

// Generate year options (current year ± 5 years)
const generateYearOptions = () => {
	const currentYear = new Date().getFullYear();
	const years: number[] = [];
	for (let i = currentYear - 5; i <= currentYear + 5; i++) {
		years.push(i);
	}
	return years;
};

const YEARS = generateYearOptions();

// View options
const VIEW_OPTIONS: { value: View; label: string; shortLabel: string }[] = [
	{ value: "day", label: "Day", shortLabel: "D" },
	{ value: "week", label: "Week", shortLabel: "W" },
	{ value: "month", label: "Month", shortLabel: "M" },
];

export function CalendarToolbar({
	date,
	view,
	onNavigate,
	onView,
}: ToolbarProps<CalendarEvent, object>) {
	const [calendarOpen, setCalendarOpen] = useState(false);
	const isMobile = useMobile();

	const currentMonth = date.getMonth();
	const currentYear = date.getFullYear();

	// Format the display date for the date picker button
	const formattedDate = useMemo(() => {
		if (isMobile) {
			return date.toLocaleDateString("en-US", {
				month: "numeric",
				day: "numeric",
			});
		}
		return date.toLocaleDateString("en-US", {
			month: "numeric",
			day: "numeric",
			year: "numeric",
		});
	}, [date, isMobile]);

	// Handle month change
	const handleMonthChange = (monthStr: string) => {
		const newMonth = parseInt(monthStr, 10);
		const newDate = new Date(date);
		newDate.setMonth(newMonth);
		onNavigate("DATE", newDate);
	};

	// Handle year change
	const handleYearChange = (yearStr: string) => {
		const newYear = parseInt(yearStr, 10);
		const newDate = new Date(date);
		newDate.setFullYear(newYear);
		onNavigate("DATE", newDate);
	};

	// Handle mini calendar date selection
	const handleDateSelect = (selectedDate: Date | undefined) => {
		if (selectedDate) {
			onNavigate("DATE", selectedDate);
			setCalendarOpen(false);
		}
	};

	// Navigate to previous period
	const handlePrev = () => onNavigate("PREV");

	// Navigate to next period
	const handleNext = () => onNavigate("NEXT");

	// Navigate to today
	const handleToday = () => onNavigate("TODAY");

	if (isMobile) {
		return (
			<div className="flex flex-col gap-2 p-2 border-b bg-card">
				{/* Top row: Navigation + Month/Year */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1">
						<Button
							variant="outline"
							size="sm"
							onClick={handleToday}
							className="h-7 px-2 text-xs"
						>
							Today
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={handlePrev}
							className="h-7 w-7"
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={handleNext}
							className="h-7 w-7"
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>

					{/* Month/Year compact */}
					<div className="flex items-center gap-1">
						<Select
							value={currentMonth.toString()}
							onValueChange={handleMonthChange}
						>
							<SelectTrigger className="w-[70px] h-7 text-xs border-none shadow-none font-medium px-2">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{MONTHS_SHORT.map((month, index) => (
									<SelectItem
										key={month}
										value={index.toString()}
										className="text-xs"
									>
										{month}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={currentYear.toString()}
							onValueChange={handleYearChange}
						>
							<SelectTrigger className="w-[65px] h-7 text-xs border-none shadow-none font-medium px-2">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{YEARS.map((year) => (
									<SelectItem
										key={year}
										value={year.toString()}
										className="text-xs"
									>
										{year}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Bottom row: View selector + Date picker */}
				<div className="flex items-center justify-between">
					{/* View Selector - Segmented buttons */}
					<div className="flex items-center bg-muted rounded-lg p-0.5">
						{VIEW_OPTIONS.map((option) => (
							<button
								key={option.value}
								onClick={() => onView(option.value)}
								className={cn(
									"px-3 py-1 text-xs font-medium rounded-md transition-colors",
									view === option.value
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								)}
							>
								{option.shortLabel}
							</button>
						))}
					</div>

					{/* Date Picker */}
					<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className="h-7 px-2 text-xs gap-1"
							>
								<CalendarDays className="h-3 w-3" />
								{formattedDate}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="end">
							<Calendar
								mode="single"
								selected={date}
								onSelect={handleDateSelect}
								initialFocus
							/>
						</PopoverContent>
					</Popover>
				</div>
			</div>
		);
	}

	// Desktop layout
	return (
		<div className="flex items-center justify-between gap-4 p-3 border-b bg-card">
			{/* Left section: Today button + Navigation arrows + Month/Year display */}
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={handleToday}
					className="font-medium"
				>
					Today
				</Button>

				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={handlePrev}
						className="h-8 w-8"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleNext}
						className="h-8 w-8"
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>

				{/* Month and Year Selectors */}
				<div className="flex items-center gap-1">
					<Select
						value={currentMonth.toString()}
						onValueChange={handleMonthChange}
					>
						<SelectTrigger className="w-[120px] h-8 border-none shadow-none font-semibold text-base">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{MONTHS.map((month, index) => (
								<SelectItem key={month} value={index.toString()}>
									{month}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select
						value={currentYear.toString()}
						onValueChange={handleYearChange}
					>
						<SelectTrigger className="w-[80px] h-8 border-none shadow-none font-semibold text-base">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{YEARS.map((year) => (
								<SelectItem key={year} value={year.toString()}>
									{year}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Right section: View selector + Date picker */}
			<div className="flex items-center gap-3">
				{/* View Selector */}
				<Select value={view} onValueChange={(v) => onView(v as View)}>
					<SelectTrigger className="w-[100px] h-8">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{VIEW_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Date Picker with Mini Calendar */}
				<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
					<PopoverTrigger asChild>
						<Button variant="outline" size="sm" className="w-[110px] h-8">
							{formattedDate}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="end">
						<Calendar
							mode="single"
							selected={date}
							onSelect={handleDateSelect}
							initialFocus
						/>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}
