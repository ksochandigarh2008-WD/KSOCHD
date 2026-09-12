import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Button, Input, Label, FieldError, Dialog, DialogContent, DialogFooter, SelectField,
} from '../../../components/admin/ui'
import { useCreateGrant, useUpdateGrant } from '../hooks'
import { grantSchema } from '../schemas'
import { FUNDS, FUND_LABELS } from '../../../data/accounts'

const blank = {
  donor: '', purpose: '', sanctionNo: '', sanctioned: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '', program: '', fund: 'Restricted', status: 'Active',
}

/**
 * Add or edit a grant or CSR commitment.
 *
 * `received` and `utilised` are deliberately absent: they are what the books say
 * arrived and was spent, computed by grantUtilisation(). Letting them be typed
 * in would let a certificate claim a figure the accounts cannot support.
 */
export default function GrantForm({ open, onOpenChange, grant, programs = [], onSaved }) {
  const create = useCreateGrant()
  const update = useUpdateGrant()
  const isEdit = Boolean(grant)
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(grantSchema),
    defaultValues: grant
      ? {
        ...blank,
        ...grant,
        sanctioned: String(grant.sanctioned ?? ''),
        program: grant.program || '',
      }
      : blank,
  })

  const submit = async (values) => {
    try {
      const payload = {
        ...values,
        sanctioned: Number(values.sanctioned),
        program: values.program || '',
        demo: false,
      }
      if (isEdit) await update.mutateAsync({ id: grant.id, patch: payload })
      else await create.mutateAsync(payload)
      toast.success(isEdit ? 'Grant updated' : 'Grant recorded')
      onSaved?.()
      onOpenChange(false)
    } catch (e) {
      toast.error(`Could not save: ${e.message}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={isEdit ? 'Edit grant' : 'Record a grant'}
        description="Sanctioned amount and period. Received and utilised are worked out from the books."
        style={{ '--dialog-w': '36rem' }}
      >
        <form onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Funder</Label>
            <Input {...register('donor')} invalid={Boolean(errors.donor)} placeholder="Netsmart Foundation" />
            <FieldError>{errors.donor?.message}</FieldError>
          </div>
          <div className="sm:col-span-2">
            <Label>Purpose</Label>
            <Input {...register('purpose')} invalid={Boolean(errors.purpose)} placeholder="School adoption — Sector 22" />
            <FieldError>{errors.purpose?.message}</FieldError>
          </div>
          <div>
            <Label>Sanction letter no.</Label>
            <Input {...register('sanctionNo')} placeholder="NSF/2026/0412" />
            <FieldError>{errors.sanctionNo?.message}</FieldError>
          </div>
          <div>
            <Label>Amount sanctioned (₹)</Label>
            <Input type="number" {...register('sanctioned')} invalid={Boolean(errors.sanctioned)} placeholder="800000" />
            <FieldError>{errors.sanctioned?.message}</FieldError>
          </div>
          <div>
            <Label>Start date</Label>
            <Input type="date" {...register('startDate')} invalid={Boolean(errors.startDate)} />
            <FieldError>{errors.startDate?.message}</FieldError>
          </div>
          <div>
            <Label>End date</Label>
            <Input type="date" {...register('endDate')} invalid={Boolean(errors.endDate)} />
            <FieldError>{errors.endDate?.message}</FieldError>
          </div>
          <Controller control={control} name="program" render={({ field }) => (
            <SelectField label="Programme" value={field.value} onChange={field.onChange}
              options={[{ value: '', label: 'General fund' }, ...programs.map((p) => ({ value: p.slug, label: p.title }))]} />
          )} />
          <Controller control={control} name="fund" render={({ field }) => (
            <SelectField label="Fund" value={field.value} onChange={field.onChange}
              options={FUNDS.map((f) => ({ value: f, label: FUND_LABELS[f] || f }))} />
          )} />
          <Controller control={control} name="status" render={({ field }) => (
            <SelectField label="Status" value={field.value} onChange={field.onChange} options={['Active', 'Closed']} />
          )} />
          <DialogFooter className="mx-[-1.25rem] mb-[-1rem] sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Record grant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
