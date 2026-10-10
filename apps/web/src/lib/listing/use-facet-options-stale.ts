"use client";

import { useEffect, useRef, useState } from "react";

/** Hide previous facet rows as soon as filter input changes (until the next fetch settles). */
export function useFacetOptionsStale(
	facetInputKey: string,
	isFetching: boolean,
) {
	const previousKeyRef = useRef(facetInputKey);
	const [stale, setStale] = useState(false);

	useEffect(() => {
		if (previousKeyRef.current !== facetInputKey) {
			previousKeyRef.current = facetInputKey;
			setStale(true);
		}
	}, [facetInputKey]);

	useEffect(() => {
		if (!isFetching) {
			setStale(false);
		}
	}, [isFetching]);

	return stale;
}
