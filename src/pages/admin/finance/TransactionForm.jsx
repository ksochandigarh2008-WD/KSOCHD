import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Button, Input, Textarea, Label, FieldError, Dialog, DialogContent, DialogFooter, SelectField,
} from '../../../components/admin/ui'
import { useCreateTransaction, useUpdateTransaction } from '../hooks'
import { transactionSchema } from '../schemas'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS, TXN_STATUS } from '../../../data/seedData'

/**
 * Record or edit one transaction. Saving here posts a voucher as well —
 * the books are always a step behind the transaction list, never a parallel ledger.
 */
export default function TransactionForm({ open, onOpenChange, txn, members, programs, onSaved }) {
  const create = useCreateTransaction()
  const update = useUpdateTransaction()
  const isEdit = Boolean(txn)
  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: txn || {
      date: new Date().toISOString().slice(0, 10), type: 'income', category: 'Donation',
      amount: '', program: '', party: '', method: 'UPI', reference: '', status: 'Cleared', note: '', memberId: '',
    },
  })

  const type = watch('type')
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const submit = async (values) => {
    try {
      const payload = { ...values, amount: Number(values.amount) }
      if (isEdit) await update.mutateAsync({ id: txn.id, patch: payload })
      else await create.mutateAsync(payload)
      toast.success(isEdit ? 'Transaction updated' : 'Transaction recorded')
      onSaved?.()
      onOpenChange(false)
    } catch (e) {
      toast.error(`Could not save: ${e.message}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={isEdit ? 'Edit transaction' : 'Record a transaction'}
        description={isEdit ? 'Update this entry.' : 'Income or expense — it flows into every report automatically.'}
        style={{ '--dialog-w': '40rem' }}
      >
        <form onSubmit={handleSubmit(submit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller control={control} name="type" render={({ field }) => (
              <SelectField label="Type" value={field.value} onChange={(v) => { field.onChange(v); field.onBlur?.() }} options={[
                { value: 'income', label: 'Money in' }, { value: 'expense', label: 'Money out' },
              ]} />
            )} />
            <Controller control={control} name="category" render={({ field, fieldState }) => (
              <SelectField label="Category" value={field.value} onChange={field.onChange} options={categories} error={fieldState.error?.message} />
            )} />
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" step="1" {...register('amount')} invalid={Boolean(errors.amount)} placeholder="5000" />
              <FieldError>{errors.amount?.message}</FieldError>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" {...register('date')} invalid={Boolean(errors.date)} />
              <FieldError>{errors.date?.message}</FieldError>
            </div>
            <div className="sm:col-span-2">
              <Label>{type === 'income' ? 'Received from' : 'Paid to'}</Label>
              <Input {...register('party')} invalid={Boolean(errors.party)} placeholder={type === 'income' ? 'Donor or grant name' : 'Vendor or payee'} />
              <FieldError>{errors.party?.message}</FieldError>
            </div>
            <Controller control={control} name="program" render={({ field }) => (
              <SelectField label="Programme" value={field.value} onChange={field.onChange}
                options={[{ value: '', label: 'General fund' }, ...programs.map((p) => ({ value: p.slug, label: p.title }))]} />
            )} />
            <Controller control={control} name="method" render={({ field }) => (
              <SelectField label="Method" value={field.value} onChange={field.onChange} options={PAYMENT_METHODS} />
            )} />
            <div>
              <Label>Reference / receipt no.</Label>
              <Input {...register('reference')} placeholder="UTR, cheque no., invoice…" />
            </div>
            <Controller control={control} name="status" render={({ field }) => (
              <SelectField label="Status" value={field.value} onChange={field.onChange} options={TXN_STATUS} />
            )} />
            <Controller control={control} name="memberId" render={({ field }) => (
              <SelectField label="Link to member (optional)" value={field.value} onChange={field.onChange}
                options={[{ value: '', label: 'Not linked' }, ...members.map((m) => ({ value: m.id, label: `${m.name} (${m.memberNo})` }))]} />
            )} />
            <div className="sm:col-span-2">
              <Label>Note / description</Label>
              <Textarea {...register('note')} rows={2} placeholder="Anything the auditors will ask about." />
            </div>
          </div>
          <DialogFooter className="mx-[-1.25rem] mb-[-1rem] mt-5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Record entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
