import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import {
  Button, Input, Textarea, Label, FieldError, Dialog, DialogContent, DialogFooter, SelectField,
} from '../../../components/admin/ui'
import { useMemo } from 'react'
import { useCreateMember, useUpdateMember } from '../hooks'
import { memberSchema } from '../schemas'
import { MEMBER_TYPES, MEMBER_STATUSES, FEE_CYCLES, CENTRES, HOUSEHOLD_RELATIONS } from '../../../data/seedData'
import { useSite } from '../../../store/useSite'
import { isRenewable, nextMemberNo, tierFee, tierOptions } from '../../../lib/membership'

/** Add or edit a membership record, including the household carried on a Family tier. */
export default function MemberForm({ open, onOpenChange, member, onSaved }) {
  const create = useCreateMember()
  const update = useUpdateMember()
  const isEdit = Boolean(member)

  // Tiers are settings-backed (Admin → Membership → Tiers & fees) so an admin can
  // rename or reprice one without a code change.
  const settings = useSite((s) => s.settings)
  const memberships = useSite((s) => s.memberships || [])
  const tiers = useMemo(() => tierOptions(settings), [settings])
  /** The number this member will actually be given — shown, not guessed at. */
  const pendingNo = useMemo(() => nextMemberNo(memberships), [memberships])

  const {
    register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(memberSchema),
    defaultValues: member
      ? { ...member, household: member.household || [] }
      : {
        name: '', email: '', phone: '', type: 'Volunteer',
        tier: tiers[0]?.value || '', status: 'Active',
        centre: CENTRES[0], joined: new Date().toISOString().slice(0, 10), renewsOn: '',
        skills: '', city: '', address: '', notes: '', avatar: '', household: [],
        feeAmount: tierFee(settings, tiers[0]?.value), feeCycle: 'annual', eventsAttended: 0,
      },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'household' })

  const tier = watch('tier')
  const feeCycle = watch('feeCycle')

  // Keep the fee in step with the tier. A tier priced at ₹0 (an honorary tier)
  // sets 0, which is correct and visible, rather than leaving a stale fee behind.
  const applyTierFee = (t) => setValue('feeAmount', tierFee(settings, t))

  const submit = async (values) => {
    try {
      const payload = {
        ...values,
        household: values.tier === 'Family'
          ? (values.household || []).filter((h) => h && String(h.name || '').trim())
          : [],
        // New members get no number here on purpose: src/lib/db.js assigns the
        // next one in sequence for every backend, which is what makes duplicates
        // impossible. Editing keeps the number the member already has.
        ...(member?.memberNo ? { memberNo: member.memberNo } : {}),
      }
      if (isEdit) await update.mutateAsync({ id: member.id, patch: payload })
      else await create.mutateAsync(payload)
      toast.success(isEdit ? 'Member updated' : 'Member added')
      onSaved?.()
      onOpenChange(false)
    } catch (e) {
      toast.error(`Could not save: ${e.message}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={isEdit ? `Edit — ${member.name}` : 'Add a member'}
        description={isEdit ? 'Update the membership record.' : 'Membership number is generated automatically.'}
        style={{ '--dialog-w': '46rem' }}
      >
        <form onSubmit={handleSubmit(submit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Full name</Label>
              <Input {...register('name')} invalid={Boolean(errors.name)} placeholder="Harpreet Singh" />
              <FieldError>{errors.name?.message}</FieldError>
            </div>
            <div>
              <Label>Membership no.</Label>
              <Input value={member?.memberNo || pendingNo} disabled />
              <p className="mt-1 text-xs text-ink-500">
                {member?.memberNo ? 'Issued when the member was added.' : 'Assigned on save, in sequence.'}
              </p>
            </div>
            <div>
              <Label>Email</Label>
              <Input {...register('email')} invalid={Boolean(errors.email)} placeholder="name@example.org" />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
            <div>
              <Label>Mobile</Label>
              <Input {...register('phone')} invalid={Boolean(errors.phone)} placeholder="98765 43210" />
              <FieldError>{errors.phone?.message}</FieldError>
            </div>

            <Controller
              control={control} name="type"
              render={({ field, fieldState }) => (
                <SelectField label="Member type" value={field.value} onChange={field.onChange} options={MEMBER_TYPES} error={fieldState.error?.message} />
              )}
            />
            <Controller
              control={control} name="tier"
              render={({ field, fieldState }) => (
                <SelectField
                  label="Tier" value={field.value}
                  onChange={(v) => { field.onChange(v); applyTierFee(v) }}
                  options={tiers}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control} name="status"
              render={({ field, fieldState }) => (
                <SelectField label="Status" value={field.value} onChange={field.onChange} options={MEMBER_STATUSES} error={fieldState.error?.message} />
              )}
            />
            <Controller
              control={control} name="centre"
              render={({ field }) => <SelectField label="Centre / chapter" value={field.value} onChange={field.onChange} options={CENTRES} />}
            />

            <div>
              <Label>Joined</Label>
              <Input type="date" {...register('joined')} />
            </div>
            <div>
              <Label>Renews on</Label>
              <Input type="date" {...register('renewsOn')} />
            </div>
            <div>
              <Label>Fee (₹)</Label>
              <Input type="number" {...register('feeAmount')} invalid={Boolean(errors.feeAmount)} />
              <FieldError>{errors.feeAmount?.message}</FieldError>
            </div>
            <div>
              <Controller
                control={control} name="feeCycle"
                render={({ field }) => <SelectField label="Fee cycle" value={field.value} onChange={field.onChange} options={FEE_CYCLES} />}
              />
              <p className="mt-1 text-xs text-ink-500">
                {isRenewable(feeCycle)
                  ? 'Renewals roll this forward, and can record the fee.'
                  : 'One-time and no-fee memberships are never renewed or charged again.'}
              </p>
            </div>
            <div>
              <Label>City</Label>
              <Input {...register('city')} placeholder="Chandigarh" />
            </div>
            <div>
              <Label>Events attended</Label>
              <Input type="number" {...register('eventsAttended')} />
            </div>
            <div className="sm:col-span-2">
              <Label>Skills / roles</Label>
              <Input {...register('skills')} placeholder="Teaching / mentoring, first aid…" />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input {...register('address')} />
            </div>
            <div className="sm:col-span-2">
              <Label>Photo URL</Label>
              <Input {...register('avatar')} placeholder="https://… (optional)" />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea {...register('notes')} placeholder="Anything the team should know." />
            </div>

            {tier === 'Family' && (
              <div className="sm:col-span-2 rounded-xl border border-ink-900/10 bg-ink-900/[0.02] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label>Household members</Label>
                    <p className="mt-0.5 text-xs text-ink-500">
                      People covered by this Family membership. Useful for events, camps and renewals.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', relation: 'Spouse' })}>
                    <Plus className="h-3.5 w-3.5" /> Add person
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <p className="mt-3 text-xs text-ink-500">No household members yet — a Family membership covers the member plus their household.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {fields.map((f, i) => (
                      <div key={f.id} className="flex items-center gap-2">
                        <Input {...register(`household.${i}.name`)} placeholder="Full name" className="flex-1" />
                        <Controller
                          control={control} name={`household.${i}.relation`}
                          render={({ field }) => (
                            <SelectField value={field.value || 'Spouse'} onChange={field.onChange} options={HOUSEHOLD_RELATIONS} className="w-36 shrink-0" />
                          )}
                        />
                        <Button
                          type="button" variant="ghost" size="icon" onClick={() => remove(i)}
                          aria-label={`Remove ${watch(`household.${i}.name`) || 'household member'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mx-[-1.25rem] mb-[-1rem] mt-5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Add member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
