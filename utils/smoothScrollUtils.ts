/**
 * Smooth Scrolling Utilities for Virtualized Grids
 * Provides smooth scrolling behavior and performance optimizations
 */

import { RefObject } from 'react';

/**
 * Smooth scroll to a specific position in a virtualized grid
 * @param containerRef - Ref to the scrollable container
 * @param targetPosition - Target scroll position
 * @param duration - Animation duration in ms
 */
export const smoothScrollTo = (
    containerRef: RefObject<HTMLElement>,
    targetPosition: number,
    duration: number = 500
): void => {
    if (!containerRef.current) return;

    const startPosition = containerRef.current.scrollTop;
    const distance = targetPosition - startPosition;
    const startTime = performance.now();

    const animation = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const easeProgress = easeInOutCubic(progress);

        containerRef.current!.scrollTop = startPosition + distance * easeProgress;

        if (progress < 1) {
            requestAnimationFrame(animation);
        }
    };

    requestAnimationFrame(animation);
};

/**
 * Ease-in-out cubic function for smooth scrolling
 * @param t - Progress (0-1)
 */
const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * Scroll to a specific item index in a virtualized grid
 * @param containerRef - Ref to the scrollable container
 * @param itemIndex - Index of the item to scroll to
 * @param itemHeight - Height of each item
 * @param gridGap - Gap between items
 */
export const scrollToItemIndex = (
    containerRef: RefObject<HTMLElement>,
    itemIndex: number,
    itemHeight: number = 300,
    gridGap: number = 16
): void => {
    if (!containerRef.current) return;

    // Calculate target position considering grid layout
    const rows = Math.floor(itemIndex / 4); // Assuming 4 columns
    const targetPosition = rows * (itemHeight + gridGap);

    smoothScrollTo(containerRef, targetPosition);
};

/**
 * Performance-optimized scroll handler for virtualized grids
 * @param containerRef - Ref to the scrollable container
 * @param onScroll - Scroll callback
 * @param throttleDelay - Throttle delay in ms
 */
export const createOptimizedScrollHandler = (
    containerRef: RefObject<HTMLElement>,
    onScroll: (scrollTop: number) => void,
    throttleDelay: number = 100
): (() => void) => {
    let lastCall = 0;
    let lastScrollTop = 0;

    return () => {
        if (!containerRef.current) return;

        const now = Date.now();
        const scrollTop = containerRef.current.scrollTop;

        // Only trigger if significant scroll change or enough time passed
        if (now - lastCall > throttleDelay || Math.abs(scrollTop - lastScrollTop) > 200) {
            onScroll(scrollTop);
            lastCall = now;
            lastScrollTop = scrollTop;
        }
    };
};