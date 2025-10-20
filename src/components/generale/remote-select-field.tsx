"use client";

import { Check, Loader2, PlusCircle, XCircle } from "lucide-react";
import * as React from "react";
import { authMessage } from "@/auth/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { cn } from "@/lib/utils";

export interface RemoteSearchOption<TValue> {
	id: string;
	label: string;
	value: TValue;
	description?: string;
	isDisabled?: boolean;
}

export type RemoteSearchSuccess<TValue> = {
	success: true;
	data: RemoteSearchOption<TValue>[];
};

export type RemoteSearchError = { success: false; error: string };

export type RemoteSearchResult<TValue> =
	| RemoteSearchSuccess<TValue>
	| RemoteSearchError;

interface RemoteSelectFieldProps<TValue> {
	selected: RemoteSearchOption<TValue>[];
	onSelectedChange: (next: RemoteSearchOption<TValue>[]) => void;
	searchAction: (query: string) => Promise<RemoteSearchResult<TValue>>;
	title?: string;
	multiple?: boolean;
	disabled?: boolean;
	minQueryLength?: number;
	idleMessage?: string;
	emptyMessage?: string;
	loadingMessage?: string;
	initialOptions?: RemoteSearchOption<TValue>[];
}

const DEFAULT_ERROR_MESSAGE = authMessage(
	"remoteSelectField.error",
	"Something went wrong while loading results.",
);

const DEFAULT_IDLE_MESSAGE = (min: number) =>
	authMessage(
		"remoteSelectField.idle",
		"Type at least {count} characters to search",
		{ count: String(min) },
	);

const DEFAULT_EMPTY_MESSAGE = authMessage(
	"remoteSelectField.empty",
	"No results found",
);

const DEFAULT_LOADING_MESSAGE = authMessage(
	"remoteSelectField.loading",
	"Searching…",
);

type HighlightConfig = { regex: RegExp; tokens: string[] };

export function RemoteSelectField<TValue>({
	selected,
	onSelectedChange,
	searchAction,
	title,
	multiple,
	disabled,
	minQueryLength = 3,
	idleMessage,
	emptyMessage,
	loadingMessage,
	initialOptions,
}: RemoteSelectFieldProps<TValue>) {
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState("");
	const [remoteOptions, setRemoteOptions] = React.useState<
		RemoteSearchOption<TValue>[]
	>([]);
	const [isSearching, setIsSearching] = React.useState(false);
	const [searchError, setSearchError] = React.useState<string>();
	const requestIdRef = React.useRef(0);

	const selectedIds = React.useMemo(
		() => new Set(selected.map((item) => item.id)),
		[selected],
	);

	const fallbackOptions = React.useMemo(() => {
		if (!initialOptions?.length && !selected.length) return [];

		const map = new Map<string, RemoteSearchOption<TValue>>();

		initialOptions?.forEach((option) => {
			map.set(option.id, option);
		});

		selected.forEach((option) => {
			map.set(option.id, option);
		});

		return Array.from(map.values());
	}, [initialOptions, selected]);

	const trimmedQuery = React.useMemo(() => query.trim(), [query]);
	const canSearch = trimmedQuery.length >= minQueryLength;

	const optionsToShow = canSearch ? remoteOptions : fallbackOptions;

	const highlightConfig = React.useMemo<HighlightConfig | null>(() => {
		if (!trimmedQuery) return null;

		const tokens = Array.from(
			new Set(
				trimmedQuery
					.split(/\s+/)
					.map((token) => token.toLowerCase())
					.filter(Boolean),
			),
		);

		if (tokens.length === 0) return null;

		const pattern = tokens.map(escapeRegExp).join("|");
		return { regex: new RegExp(`(${pattern})`, "gi"), tokens };
	}, [trimmedQuery]);

	const runSearch = React.useCallback(
		async (incomingValue: string) => {
			const value = incomingValue.trim();

			if (value.length < minQueryLength) {
				requestIdRef.current += 1;
				setRemoteOptions([]);
				setIsSearching(false);
				setSearchError(undefined);
				return;
			}

			const requestId = requestIdRef.current + 1;
			requestIdRef.current = requestId;
			setIsSearching(true);

			try {
				const result = await searchAction(value);

				if (requestId !== requestIdRef.current) return;

				if (!result.success) {
					setRemoteOptions([]);
					setSearchError(result.error || DEFAULT_ERROR_MESSAGE);
					return;
				}

				setRemoteOptions(result.data ?? []);
				setSearchError(undefined);
			} catch (error) {
				if (requestId !== requestIdRef.current) return;

				const message =
					error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE;
				setRemoteOptions([]);
				setSearchError(message || DEFAULT_ERROR_MESSAGE);
			} finally {
				if (requestId === requestIdRef.current) {
					setIsSearching(false);
				}
			}
		},
		[minQueryLength, searchAction],
	);

	const debouncedSearch = useDebouncedCallback(runSearch, 500);

	const handleInputValueChange = React.useCallback(
		(value: string) => {
			setQuery(value);
			setSearchError(undefined);
			debouncedSearch(value);
		},
		[debouncedSearch],
	);

	const handleOptionToggle = React.useCallback(
		(option: RemoteSearchOption<TValue>) => {
			const isSelected = selectedIds.has(option.id);

			if (multiple) {
				const next = isSelected
					? selected.filter((item) => item.id !== option.id)
					: [...selected, option];
				onSelectedChange(next);
				return;
			}

			if (isSelected) {
				onSelectedChange([]);
			} else {
				onSelectedChange([option]);
				setOpen(false);
			}
		},
		[multiple, onSelectedChange, selected, selectedIds],
	);

	const handleReset = React.useCallback(
		(event?: React.MouseEvent) => {
			event?.stopPropagation();
			onSelectedChange([]);
		},
		[onSelectedChange],
	);

	React.useEffect(() => {
		if (!open) {
			setQuery("");
			setSearchError(undefined);
			setRemoteOptions([]);
			setIsSearching(false);
			requestIdRef.current += 1;
		}
	}, [open]);

	const handleWheel = React.useCallback((event: React.WheelEvent) => {
		event.stopPropagation();
	}, []);

	const emptyStateMessage = React.useMemo(() => {
		if (searchError) return searchError;

		if (!canSearch) {
			return idleMessage ?? DEFAULT_IDLE_MESSAGE(minQueryLength);
		}

		return emptyMessage ?? DEFAULT_EMPTY_MESSAGE;
	}, [canSearch, emptyMessage, idleMessage, minQueryLength, searchError]);

	const loaderMessage = loadingMessage ?? DEFAULT_LOADING_MESSAGE;

	const selectedCount = selected.length;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="border-dashed"
					disabled={disabled}
				>
					{selectedCount > 0 ? (
						<div
							role="button"
							aria-label={authMessage("remoteSelectField.clear", "Clear selection")}
							tabIndex={0}
							onClick={handleReset}
							className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
						>
							<XCircle />
						</div>
					) : (
						<PlusCircle />
					)}
					{title}
					{selectedCount > 0 && (
						<>
							<Separator
								orientation="vertical"
								className="mx-0.5 data-[orientation=vertical]:h-4"
							/>
							<Badge
								variant="secondary"
								className="rounded-sm px-1 font-normal lg:hidden"
							>
								{selectedCount}
							</Badge>
							<div className="hidden items-center gap-1 lg:flex">
								{selectedCount > 2 ? (
									<Badge variant="secondary" className="rounded-sm px-1 font-normal">
										{authMessage("remoteSelectField.selectedCount", "{count} selected", {
											count: String(selectedCount),
										})}
									</Badge>
								) : (
									selected.map((option) => (
										<Badge
											variant="secondary"
											key={`${title ?? "remote"}-${option.id}-selected`}
											className="rounded-sm px-1 py-0 font-normal"
										>
											{option.label}
										</Badge>
									))
								)}
							</div>
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="p-0" align="start" onWheel={handleWheel}>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder={title}
						value={query}
						onValueChange={handleInputValueChange}
					/>
					<CommandList className="max-h-full">
						<CommandEmpty>
							{isSearching && !searchError ? (
								<span className="flex items-center justify-center gap-2">
									<Loader2 className="size-4 animate-spin" />
									{loaderMessage}
								</span>
							) : (
								emptyStateMessage
							)}
						</CommandEmpty>
						{optionsToShow.length > 0 && (
							<CommandGroup className="max-h-[18.75rem] overflow-y-auto overflow-x-hidden">
								{optionsToShow.map((option) => {
									const isSelected = selectedIds.has(option.id);

									return (
										<CommandItem
											key={`${title ?? "remote"}-${option.id}-command`}
											onSelect={() => handleOptionToggle(option)}
											disabled={option.isDisabled}
										>
											<div
												className={cn(
													"flex size-4 items-center justify-center rounded-sm border border-primary",
													isSelected ? "bg-primary" : "opacity-50 [&_svg]:invisible",
												)}
											>
												<Check className="rtl:scale-100" />
											</div>
											<span className="flex min-w-0 flex-col">
												<span className="truncate">
													{highlightConfig
														? renderHighlightedLabel(option.label, highlightConfig)
														: option.label}
												</span>
												{option.description && (
													<span className="truncate text-xs text-muted-foreground">
														{highlightConfig
															? renderHighlightedLabel(option.description, highlightConfig)
															: option.description}
													</span>
												)}
											</span>
										</CommandItem>
									);
								})}
							</CommandGroup>
						)}
						{selectedCount > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										onSelect={() => handleReset()}
										className="justify-center text-center"
									>
										{authMessage("remoteSelectField.clearSelection", "Clear selection")}
									</CommandItem>
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

function renderHighlightedLabel(
	label: string,
	config: HighlightConfig,
): React.ReactNode {
	const parts = label.split(config.regex);

	if (parts.length === 1) {
		return label;
	}

	let keyIndex = 0;

	return parts.map((part) => {
		if (!part) {
			keyIndex += 1;
			return null;
		}

		const lowerCasePart = part.toLowerCase();
		const isMatch = config.tokens.some((token) => token === lowerCasePart);

		const key = `${lowerCasePart}-${keyIndex++}`;

		if (isMatch) {
			return (
				<span key={key} className="font-semibold">
					{part}
				</span>
			);
		}

		return <React.Fragment key={key}>{part}</React.Fragment>;
	});
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
