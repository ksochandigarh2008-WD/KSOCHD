import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button, Input, Label, FieldError, Dialog, DialogContent, DialogFooter, SelectField } from '../../../components/admin/ui'
import { useCreatePledge, useUpdatePledge } from '../hooks'
import { pledgeSchema } from '../schemas'
import { PLEDGE_FREQUENCIES } from '../../../data/seedData'

/** Add or edit a recurring commitment (monthly / annual giving). */
export default function PledgeForm({ open, onOpenChange, pledge, programs, onSaved }) {
  const create = useCreatePledge()
  const update = useUpdatePledge()
  const isEdit = Boolean(pledge)
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(pledgeSchema),
    defaultValues: pledge || {
      name: '', amount: '', frequency: 'monthly', startDate: new Date().toISOString().slice(0, 10),
      nextDue: new Date().toISOString().slice(0, 10), program: '', status: 'Active', note: '',
    },
  })

  const submit = async (values) => {
    try {
      const payload = { ...values, amount: Number(values.amount) }
      if (isEdit) await update.mutateAsync({ id: pledge.id, patch: payload })
      else await create.mutateAsync(payload)
      toast.success(isEdit ? 'Commitment updated' : 'Commitment recorded')
      onSaved?.()
      onOpenChange(false)
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? 'Edit commitment' : 'Add a recurring commitment'} style={{ '--dialog-w': '32rem' }}>
        <form onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Name</Label>
            <Input {...register('name')} invalid={Boolean(errors.name)} placeholder="Donor or organisation" />
            <FieldError>{errors.name?.message}</FieldError>
          </div>
          <div>
            <Label>Amount (₹)</Label>
            <Input type="number" {...register('amount')} invalid={Boolean(errors.amount)} />
            <FieldError>{errors.amount?.message}</FieldError>
          </div>
          <Controller control={control} name="frequency" render={({ field }) => (
            <SelectField label="Frequency" value={field.value} onChange={field.onChange} options={PLEDGE_FREQUENCIES} />
          )} />
          <div>
            <Label>Start date</Label>
            <Input type="date" {...register('startDate')} />
          </div>
          <div>
            <Label>Next due</Label>
            <Input type="date" {...register('nextDue')} />
          </div>
          <Controller control={control} name="program" render={({ field }) => (
            <SelectField label="Programme" value={field.value} onChange={field.onChange}
              options={[{ value: '', label: 'General fund' }, ...programs.map((p) => ({ value: p.slug, label: p.title }))]} />
          )} />
          <Controller control={control} name="status" render={({ field }) => (
            <SelectField label="Status" value={field.value} onChange={field.onChange} options={['Active', 'Paused', 'Completed', 'Lapsed']} />
          )} />
          <div className="sm:col-span-2">
            <Label>Note</Label>
            <Input {...register('note')} />
          </div>
          <DialogFooter className="mx-[-1.25rem] mb-[-1rem] sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isEdit ? 'Save' : 'Add commitment'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
