/**
 * Calendar Localizer Configuration
 * Centralized date-fns localizer for react-big-calendar
 */

import { dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";

const locales = {
	"en-US": enUS,
};

export const calendarLocalizer = dateFnsLocalizer({
	format,
	parse,
	startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
	getDay,
	locales,
});

// Export format helpers for consistent date formatting
export const formatters = {
	time: (date: Date) => format(date, "h:mm a"),
	date: (date: Date) => format(date, "MMM d, yyyy"),
	dayOfWeek: (date: Date) => format(date, "EEEE"),
	shortDate: (date: Date) => format(date, "MMM d"),
};
