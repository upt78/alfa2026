import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Check, FileText, Landmark, PenLine, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { fmt, monthlyPay, type Product } from '@/lib/data'

type Props = {
  product: Product | null
  onClose: () => void
  onFinish: (amount: number, term: number) => void
}

const PURPOSES = ['Пополнение оборотных средств', 'Закупка товара', 'Оборудование', 'Ремонт помещения', 'Другое']
const DOCS = [
  { name: 'Паспорт', auto: true },
  { name: 'Выписка по расчётному счёту', auto: true },
  { name: 'Налоговая декларация', auto: false },
]

export function ApplyWizard({ product, onClose, onFinish }: Props) {
  const [step, setStep] = useState(0)
  const [amount, setAmount] = useState(1_000_000)
  const [term, setTerm] = useState(12)
  const [purpose, setPurpose] = useState(PURPOSES[0])
  const [docsReady, setDocsReady] = useState<boolean[]>(DOCS.map((d) => d.auto))
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const pay = useMemo(
    () => (product ? monthlyPay(amount, product.rateFrom + 1.5, term) : 0),
    [product, amount, term],
  )

  if (!product) return null

  const close = () => {
    setStep(0)
    setDocsReady(DOCS.map((d) => d.auto))
    setCode('')
    onClose()
  }

  const submit = () => {
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      onFinish(amount, term)
      close()
      toast.success('Заявка отправлена в банк', {
        description: 'Отслеживать статус можно в разделе «История». Решение — обычно в течение часа.',
      })
    }, 1400)
  }

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            {product.name}
          </DialogTitle>
          <DialogDescription>{product.bank}</DialogDescription>
        </DialogHeader>

        {/* Прогресс */}
        <div className="flex gap-1.5">
          {['Сумма', 'Документы', 'Подписание'].map((s, i) => (
            <div
              key={s}
              className={`flex-1 rounded-full h-1.5 ${i <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Сумма</span>
                <span className="font-bold">{amount >= 1_000_000 ? (amount / 1_000_000).toLocaleString('ru-RU') + ' млн ₽' : fmt(amount)}</span>
              </div>
              <input
                type="range"
                min={product.amountFrom}
                max={product.amountTo}
                step={50_000}
                value={amount}
                onChange={(e) => setAmount(+e.target.value)}
                className="w-full accent-teal-700"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{fmt(product.amountFrom)}</span>
                <span>{product.amountTo >= 1_000_000 ? product.amountTo / 1_000_000 + ' млн ₽' : fmt(product.amountTo)}</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Срок</div>
              <div className="flex flex-wrap gap-2">
                {[6, 12, 24, 36, 60].filter((t) => t >= product.termFrom && t <= product.termTo).map((t) => (
                  <Badge
                    key={t}
                    variant={term === t ? 'default' : 'outline'}
                    className="cursor-pointer px-3 py-1"
                    onClick={() => setTerm(t)}
                  >
                    {t} мес
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Цель кредита</div>
              <div className="flex flex-wrap gap-2">
                {PURPOSES.map((p) => (
                  <Badge
                    key={p}
                    variant={purpose === p ? 'default' : 'outline'}
                    className="cursor-pointer font-normal"
                    onClick={() => setPurpose(p)}
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ежемесячный платёж</span>
              <span className="font-bold">{fmt(pay)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ставка (предварительно)</span>
              <span className="font-semibold">от {(product.rateFrom + 1.5).toFixed(1)}%</span>
            </div>
            <Button className="w-full" onClick={() => setStep(1)}>Продолжить</Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Часть документов мы получили автоматически по вашему ИНН и счёту.
            </p>
            {DOCS.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  {d.name}
                  {d.auto && <Badge variant="secondary" className="text-xs">авто</Badge>}
                </div>
                {docsReady[i] ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                    <Check className="h-4 w-4" /> загружен
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => {
                    const next = [...docsReady]
                    next[i] = true
                    setDocsReady(next)
                  }}>
                    Загрузить
                  </Button>
                )}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>Назад</Button>
              <Button className="flex-1" disabled={!docsReady.every(Boolean)} onClick={() => setStep(2)}>
                Продолжить
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Продукт</span><span className="font-medium">{product.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Сумма</span><span className="font-medium">{fmt(amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Срок</span><span className="font-medium">{term} мес</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Платёж</span><span className="font-medium">{fmt(pay)} / мес</span></div>
            </div>
            <div>
              <div className="text-sm mb-1.5 flex items-center gap-1.5">
                <PenLine className="h-4 w-4 text-primary" />
                Подтвердите SMS-кодом (демо: любой код)
              </div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full rounded-md border bg-background px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Назад</Button>
              <Button className="flex-1" disabled={code.length < 4 || submitting} onClick={submit}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Подписать и отправить
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
