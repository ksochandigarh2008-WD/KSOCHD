import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind-aware class merger (clsx + tailwind-merge). */
export const cn = (...inputs) => twMerge(clsx(inputs))
export default cn
