"use client";

import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useMobile } from "@/hooks/use-mobile";

const Toaster = ({ ...props }: ToasterProps) => {
	const { resolvedTheme } = useTheme();
	const isMobile = useMobile();

	return (
		<Sonner
			theme={resolvedTheme === "dark" ? "dark" : "light"}
			className="toaster group"
			position={isMobile ? "top-center" : "bottom-right"}
			toastOptions={{
				classNames: {
					toast: "rounded-lg",
					title: "font-medium",
				},
			}}
			icons={{
				success: <CircleCheckIcon className="size-4 text-green-500" />,
				info: <InfoIcon className="size-4 text-blue-500" />,
				warning: <TriangleAlertIcon className="size-4 text-yellow-500" />,
				error: <OctagonXIcon className="size-4 text-red-500" />,
				loading: <Loader2Icon className="size-4 animate-spin" />,
			}}
			{...props}
		/>
	);
};

export { Toaster };
