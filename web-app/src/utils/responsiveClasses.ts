/**
 * Utility functions for common responsive className patterns
 * Used to maintain consistency across the application and reduce duplication
 */

/**
 * Standard button base classes for tablet-optimized buttons
 * Provides consistent sizing, touch targets, and responsive behaviour
 */
export const buttonBaseClasses = 'px-4 py-2.5 md:py-2 text-sm md:text-base min-h-[44px] md:min-h-0 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Standard input base classes for tablet-optimized form inputs
 * Provides consistent sizing, touch targets, and prevents iOS zoom
 */
export const inputBaseClasses = 'w-full rounded bg-pb-darker border border-pb-primary/30 p-2 md:p-2.5 text-white text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-pb-primary/50 min-h-[44px] md:min-h-0';

/**
 * Standard textarea base classes for tablet-optimized textareas
 */
export const textareaBaseClasses = 'w-full rounded bg-pb-darker border border-pb-primary/30 p-2 md:p-2.5 text-white text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-pb-primary/50 resize-none';

/**
 * Standard modal button classes (cancel/secondary variant)
 */
export const modalCancelButtonClasses = `${buttonBaseClasses} text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50`;

/**
 * Standard modal button classes (primary/confirm variant)
 */
export const modalPrimaryButtonClasses = (variant: 'default' | 'danger' = 'default') => {
  const base = `${buttonBaseClasses} text-white rounded-md`;
  return variant === 'danger'
    ? `${base} bg-red-600 hover:bg-red-700`
    : `${base} bg-blue-600 hover:bg-blue-700`;
};

/**
 * Standard modal title classes
 */
export const modalTitleClasses = 'text-base md:text-lg font-semibold break-words flex-1 min-w-0 pr-2';

/**
 * Standard modal text classes
 */
export const modalTextClasses = 'text-sm md:text-base break-words';

/**
 * Standard modal close button classes
 */
export const modalCloseButtonClasses = 'p-2 hover:bg-pb-primary/20 rounded-lg transition-colors flex-shrink-0 min-h-[44px] md:min-h-0 w-10 h-10 md:w-auto md:h-auto flex items-center justify-center';



