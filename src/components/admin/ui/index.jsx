/**
 * Admin UI primitives — shadcn-style wrappers over Radix, styled with the site's
 * runtime theme (brand / accent / ink CSS variables) so the admin and the public
 * site always match.
 */
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cva } from 'class-variance-authority'
import { Check, ChevronDown, ChevronUp, X, CheckCircle2 } from 'lucide-react'
import { cn } from '../../../lib/cn'

/* --------------------------------- Button -------------------------------- */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[.98]',
  {
    variants: {
      variant: {
        default: 'bg-brand-700 text-white shadow-sm hover:bg-brand-800',
        accent: 'bg-accent-500 text-ink-900 hover:bg-accent-600',
        outline: 'border border-ink-900/15 bg-white text-ink-900 hover:bg-ink-900/5',
        ghost: 'text-ink-700 hover:bg-ink-900/5',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-11 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
)

export const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
))
Button.displayName = 'Button'

/* --------------------------------- Inputs -------------------------------- */
export const Input = React.forwardRef(({ className, type = 'text', invalid, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      'flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-sm placeholder:text-ink-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:cursor-not-allowed disabled:opacity-50',
      invalid ? 'border-red-400 focus:border-red-500' : 'border-ink-900/12 focus:border-brand-500',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[80px] w-full rounded-xl border border-ink-900/12 bg-white px-3 py-2 text-sm placeholder:text-ink-500/60 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label ref={ref} className={cn('mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500', className)} {...props} />
))
Label.displayName = 'Label'

export const FieldError = ({ children }) =>
  children ? <p className="mt-1 text-xs font-medium text-red-600">{children}</p> : null

/* --------------------------------- Select -------------------------------- */
export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-ink-900/12 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:opacity-50 [&>span]:truncate',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = 'SelectTrigger'

export const SelectContent = React.forwardRef(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'relative z-[110] max-h-72 min-w-[8rem] overflow-hidden rounded-xl border border-ink-900/10 bg-white text-ink-900 shadow-lift data-[state=open]:animate-pop-in',
        position === 'popper' && 'data-[side=bottom]:translate-y-1',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center">
        <ChevronUp className="h-4 w-4" />
      </SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport className={cn('p-1', position === 'popper' && 'w-full min-w-[var(--radix-select-trigger-width)]')}>
        {children}
      </SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center">
        <ChevronDown className="h-4 w-4" />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = 'SelectContent'

export const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-900 data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-brand-700" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = 'SelectItem'

/** Convenience: <SelectField label="" value onChange options={['a','b']} /> */
export function SelectField({ label, value, onChange, options = [], placeholder = 'Select…', className, error }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {opts.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError>{error}</FieldError>
    </div>
  )
}

/* --------------------------------- Dialog -------------------------------- */
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export const DialogContent = React.forwardRef(({ className, children, title, description, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-ink-900/50 backdrop-blur-sm data-[state=open]:animate-fade-in" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-[101] flex max-h-[90vh] w-[min(94vw,var(--dialog-w,42rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-lift data-[state=open]:animate-pop-in',
        className,
      )}
      {...props}
    >
      {!title && <DialogPrimitive.Title className="sr-only">Dialog</DialogPrimitive.Title>}
      {title && (
        <div className="flex items-start justify-between gap-4 border-b border-ink-900/5 px-5 py-4">
          <div>
            <DialogPrimitive.Title className="font-display text-lg font-bold">{title}</DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="mt-0.5 text-xs text-ink-500">{description}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-900/5">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
DialogContent.displayName = 'DialogContent'

export const DialogFooter = ({ children, className }) => (
  <div className={cn('flex flex-wrap items-center justify-end gap-2 border-t border-ink-900/5 bg-ink-900/[0.015] px-5 py-3.5', className)}>
    {children}
  </div>
)

/* ------------------------------ Alert dialog ----------------------------- */
export const AlertDialog = AlertDialogPrimitive.Root

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', destructive, onConfirm }) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-ink-900/50 backdrop-blur-sm" />
        <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[101] w-[min(94vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-lift data-[state=open]:animate-pop-in">
          <AlertDialogPrimitive.Title className="font-display text-lg font-bold">{title}</AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-ink-600">
            {description}
          </AlertDialogPrimitive.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>{confirmLabel}</Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}

/* ---------------------------------- Tabs --------------------------------- */
export const Tabs = TabsPrimitive.Root

export const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn('inline-flex items-center gap-1 rounded-xl bg-ink-900/5 p-1', className)} {...props} />
))
TabsList.displayName = 'TabsList'

export const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-ink-600 transition data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-sm',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = 'TabsTrigger'

export const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn('mt-4 focus-visible:outline-none', className)} {...props} />
))
TabsContent.displayName = 'TabsContent'

/* --------------------------------- Badge --------------------------------- */
export const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    tone: {
      brand: 'bg-brand-50 text-brand-700',
      accent: 'bg-accent-500/15 text-accent-600',
      green: 'bg-emerald-50 text-emerald-700',
      red: 'bg-red-50 text-red-700',
      amber: 'bg-amber-50 text-amber-700',
      blue: 'bg-blue-50 text-blue-700',
      slate: 'bg-ink-900/6 text-ink-700',
    },
  },
  defaultVariants: { tone: 'brand' },
})

export const Badge = ({ className, tone, ...props }) => <span className={cn(badgeVariants({ tone }), className)} {...props} />

/* ---------------------------------- Card --------------------------------- */
export const Card = ({ className, ...props }) => (
  <div className={cn('rounded-2xl border border-ink-900/5 bg-white shadow-soft', className)} {...props} />
)
export const CardHeader = ({ className, ...props }) => <div className={cn('border-b border-ink-900/5 p-5', className)} {...props} />
export const CardTitle = ({ className, ...props }) => <h3 className={cn('font-display text-base font-bold', className)} {...props} />
export const CardBody = ({ className, ...props }) => <div className={cn('p-5', className)} {...props} />

/* -------------------------------- Checkbox ------------------------------- */
export const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded border border-ink-900/25 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-50 data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-600',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
      <Check className="h-3 w-3" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = 'Checkbox'

/* --------------------------------- Switch -------------------------------- */
export const Switch = React.forwardRef(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-50 data-[state=checked]:bg-brand-600 data-[state=unchecked]:bg-ink-900/15',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitive.Root>
))
Switch.displayName = 'Switch'

/* -------------------------------- Progress ------------------------------- */
export const Progress = React.forwardRef(({ className, value = 0, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-2 w-full overflow-hidden rounded-full bg-ink-900/10', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn('h-full rounded-full bg-brand-600 transition-all', indicatorClassName)}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = 'Progress'

/* --------------------------------- Tooltip ------------------------------- */
export const TooltipProvider = TooltipPrimitive.Provider
export const TooltipRoot = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger
export const TooltipContent = React.forwardRef(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn('z-[120] rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lift', className)}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = 'TooltipContent'

export function Tooltip({ children, content, side = 'top' }) {
  if (!content) return children
  return (
    <TooltipRoot>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </TooltipRoot>
  )
}

/* ------------------------------ Dropdown menu ---------------------------- */
export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

export const DropdownMenuContent = React.forwardRef(({ className, align = 'end', sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn('z-[110] min-w-[11rem] overflow-hidden rounded-xl border border-ink-900/8 bg-white p-1 shadow-lift data-[state=open]:animate-pop-in', className)}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = 'DropdownMenuContent'

export const DropdownMenuItem = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition data-[highlighted]:bg-ink-900/5 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
      className,
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = 'DropdownMenuItem'

export const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} className={cn('my-1 h-px bg-ink-900/8', className)} {...props} />
))
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

export const DropdownMenuLabel = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label ref={ref} className={cn('px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500', className)} {...props} />
))
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

/* --------------------------------- Avatar -------------------------------- */
export const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root ref={ref} className={cn('relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full', className)} {...props} />
))
Avatar.displayName = 'Avatar'
export const AvatarImage = AvatarPrimitive.Image
export const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn('flex h-full w-full items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800', className)}
    {...props}
  />
))
AvatarFallback.displayName = 'AvatarFallback'

/* ------------------------------- Separator ------------------------------- */
export const Separator = React.forwardRef(({ className, orientation = 'horizontal', ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    orientation={orientation}
    className={cn('shrink-0 bg-ink-900/8', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)}
    {...props}
  />
))
Separator.displayName = 'Separator'

/* --------------------------------- Popover ------------------------------- */
export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverContent = React.forwardRef(({ className, align = 'start', sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn('z-[110] w-72 rounded-xl border border-ink-900/8 bg-white p-4 shadow-lift data-[state=open]:animate-pop-in', className)}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = 'PopoverContent'

/* -------------------------------- Skeleton ------------------------------- */
export const Skeleton = ({ className, ...props }) => (
  <div className={cn('animate-pulse rounded-lg bg-ink-900/8', className)} {...props} />
)

/* -------------------------------- Empty state ---------------------------- */
export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-900/12 px-6 py-12 text-center">
      {Icon && (
        <span className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="font-display text-base font-bold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* -------------------------------- Stat card ------------------------------ */
export function StatCard({ label, value, hint, icon: Icon, tone = 'brand', trend }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    accent: 'bg-accent-500/15 text-accent-600',
    slate: 'bg-ink-900/6 text-ink-700',
  }
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-ink-500">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold leading-none">{value}</p>
          {hint && <p className="mt-1.5 truncate text-[11px] text-ink-500">{hint}</p>}
          {trend != null && (
            <p className={cn('mt-1.5 text-[11px] font-semibold', trend >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs previous period
            </p>
          )}
        </div>
        {Icon && <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', tones[tone])}><Icon className="h-4 w-4" /></span>}
      </div>
    </Card>
  )
}

/* ------------------------------ Success state ---------------------------- */
export const SuccessDot = ({ children }) => (
  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
    <CheckCircle2 className="h-3.5 w-3.5" /> {children}
  </span>
)
