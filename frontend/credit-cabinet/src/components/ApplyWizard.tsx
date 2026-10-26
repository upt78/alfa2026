import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Check, FileText, Landmark, PenLine, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { fmt, monthlyPay, type Product, type User } from '@/lib/data'

type Props = {
  product: Product | null
  user: User | null
  onClose: () => void
  onFinish: (amount: number, term: number, purpose: string) => Promise<void>
}

const PURPOSES = ['Пополнение оборотных средств', 'Закупка товара', 'Покупка оборудования', 'Ремонт помещения', 'Закрытие кассового разрыва']
const TERMS = [3, 6, 12, 18, 24, 36, 48, 60, 84]
const DOCS = [
  { name: 'Регистрационные данные', auto: true },
  { name: 'Финансовые показатели', auto: true },
  { name: 'Подтверждение цели', auto: false },
]

export function ApplyWizard({ product, user, onClose, onFinish }: Props) {
  const [step, setStep] = useState(0)
  const [amount, setAmount] = useState(1_000_000)
  const [term, setTerm] = useState(12)
  const [purpose, setPurpose] = useState(PURPOSES[0])
  const [docsReady, setDocsReady] = useState<boolean[]>(DOCS.map((d) => d.auto))
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!product) return
    setAmount(Math.min(Math.max(1_000_000, product.amountFrom), product.amountTo))
    setTerm(TERMS.find((t) => t >= product.termFrom && t <= product.termTo) ?? product.termFrom)
    setStep(0)
    setCode('')
    setDocsReady(DOCS.map((d) => d.auto))
  }, [product])

  const pay = useMemo(() => product ? monthlyPay(amount, product.rateFrom + 1.5, term) : 0, [product, amount, term])
  if (!product || !user) return null

  const close = () => {
    setStep(0)
    setCode('')
    onClose()
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      await onFinish(amount, term, purpose)
      toast.success('Заявка сохранена и отправлена', { description: 'Статусы будут обновляться автоматически в разделе «Заявки».' })
    } catch (error) {
      toast.error('Не удалось создать заявку', { description: error instanceof Error ? error.message : 'Проверьте API' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" />{product.name}</DialogTitle>
          <DialogDescription>{product.bank} · {user.name}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1.5">
          {['Параметры', 'Данные', 'Отправка'].map((s, i) => <div key={s} className={`flex-1 rounded-full h-1.5 ${i <= step ? 'bg-primary' : 'bg-muted'}`} />)}
        </div>

        {step === 0 && <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2"><span className="text-muted-foreground">Сумма</span><span className="font-bold">{fmt(amount)}</span></div>
            <input type="range" min={product.amountFrom} max={product.amountTo} step={50_000} value={amount} onChange={(e) => setAmount(+e.target.value)} className="w-full accent-teal-700" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>{fmt(product.amountFrom)}</span><span>{fmt(product.amountTo)}</span></div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-2">Срок</div>
            <div className="flex flex-wrap gap-2">{TERMS.filter((t) => t >= product.termFrom && t <= product.termTo).map((t) => <Badge key={t} variant={term === t ? 'default' : 'outline'} className="cursor-pointer px-3 py-1" onClick={() => setTerm(t)}>{t} мес</Badge>)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-2">Цель кредита</div>
            <div className="flex flex-wrap gap-2">{PURPOSES.map((p) => <Badge key={p} variant={purpose === p ? 'default' : 'outline'} className="cursor-pointer font-normal" onClick={() => setPurpose(p)}>{p}</Badge>)}</div>
          </div>
          <Separator />
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Предварительный платёж</span><span className="font-bold">{fmt(pay)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Ставка до скоринга</span><span className="font-semibold">от {(product.rateFrom + 1.5).toFixed(1)}%</span></div>
          <Button className="w-full" onClick={() => setStep(1)}>Продолжить</Button>
        </div>}

        {step === 1 && <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Данные профиля и результаты локальных моков прикреплены к заявке. Реальные документы никуда не отправляются.</p>
          {DOCS.map((d, i) => <div key={d.name} className="flex items-center justify-between rounded-lg border p-3 gap-2">
            <div className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-primary shrink-0" />{d.name}{d.auto && <Badge variant="secondary" className="text-xs">из профиля</Badge>}</div>
            {docsReady[i] ? <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium whitespace-nowrap"><Check className="h-4 w-4" /> готово</span> : <Button size="sm" variant="outline" onClick={() => setDocsReady(DOCS.map((_, index) => index <= i ? true : docsReady[index]))}>Подтвердить</Button>}
          </div>)}
          <div className="flex gap-2 pt-1"><Button variant="outline" className="flex-1" onClick={() => setStep(0)}>Назад</Button><Button className="flex-1" disabled={!docsReady.every(Boolean)} onClick={() => setStep(2)}>Продолжить</Button></div>
        </div>}

        {step === 2 && <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Продукт</span><span className="font-medium text-right">{product.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Сумма</span><span className="font-medium">{fmt(amount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Срок</span><span className="font-medium">{term} мес</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Цель</span><span className="font-medium text-right">{purpose}</span></div>
          </div>
          <div>
            <div className="text-sm mb-1.5 flex items-center gap-1.5"><PenLine className="h-4 w-4 text-primary" />Локальное подтверждение заявки</div>
            <p className="text-xs text-muted-foreground mb-2">Введите любые 4 цифры. SMS и внешние сервисы не используются.</p>
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" inputMode="numeric" className="w-full rounded-md border bg-background px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Назад</Button><Button className="flex-1" disabled={code.length < 4 || submitting} onClick={submit}>{submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}Отправить в банк</Button></div>
        </div>}
      </DialogContent>
    </Dialog>
  )
}
