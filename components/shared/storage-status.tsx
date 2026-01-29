"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { HardDrive, Database, Folder, Settings, Palette } from "lucide-react";
import {
	storage,
	StorageStatus as StorageStatusType,
} from "@/lib/utils/storage";

interface StorageStatusProps {
	refreshTrigger?: number;
}

/**
 * StorageStatus - Reusable storage usage display component
 * Shows localStorage usage breakdown with visual progress bar
 */
export function StorageStatus({ refreshTrigger }: StorageStatusProps) {
	const [status, setStatus] = React.useState<StorageStatusType | null>(null);

	React.useEffect(() => {
		setStatus(storage.getStorageStatus());
	}, [refreshTrigger]);

	const formatBytes = (bytes: number): string => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	// Estimate localStorage limit (usually 5-10MB)
	const estimatedLimit = 10 * 1024 * 1024;
	const usagePercent = status ? (status.total / estimatedLimit) * 100 : 0;

	if (!status) return null;

	return (
		<div className="space-y-4">
			<h3 className="text-sm font-semibold flex items-center gap-2">
				<HardDrive size={16} />
				Local Storage Usage
			</h3>

			<div className="space-y-3">
				{/* Progress bar */}
				<div className="space-y-1">
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>{status.totalFormatted} used</span>
						<span>~10 MB limit</span>
					</div>
					<div className="h-2 bg-muted rounded-full overflow-hidden">
						<motion.div
							initial={{ width: 0 }}
							animate={{ width: `${Math.min(usagePercent, 100)}%` }}
							transition={{ duration: 0.5, ease: "easeOut" }}
							className={`h-full rounded-full ${
								usagePercent > 80
									? "bg-destructive"
									: usagePercent > 50
										? "bg-yellow-500"
										: "bg-primary"
							}`}
						/>
					</div>
				</div>

				{/* Breakdown */}
				<div className="grid grid-cols-2 gap-2 text-sm">
					<div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
						<Database size={14} className="text-muted-foreground" />
						<div>
							<p className="text-xs text-muted-foreground">Chat Sessions</p>
							<p className="font-medium">{formatBytes(status.sessions)}</p>
						</div>
					</div>
					<div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
						<Folder size={14} className="text-muted-foreground" />
						<div>
							<p className="text-xs text-muted-foreground">Folders</p>
							<p className="font-medium">{formatBytes(status.folders)}</p>
						</div>
					</div>
					<div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
						<Settings size={14} className="text-muted-foreground" />
						<div>
							<p className="text-xs text-muted-foreground">Settings</p>
							<p className="font-medium">{formatBytes(status.settings)}</p>
						</div>
					</div>
					<div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
						<Palette size={14} className="text-muted-foreground" />
						<div>
							<p className="text-xs text-muted-foreground">Theme</p>
							<p className="font-medium">{formatBytes(status.theme)}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
