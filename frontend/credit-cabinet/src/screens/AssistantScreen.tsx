import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, CheckCheck, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ProductCard } from '@/components/ProductCard'
import { getRecommendations } from '@/lib/api'
import { type CreditItem, type Product, type User } from '@/lib/data'

type MsgIn = { from: 'bot' | 'user'; text: string } | { from: 'bot'; product: Product; why: string }
type Msg = MsgIn & { id: number }
type Stage = 'start' | 'ask_amount' | 'ask_term' | 'done'

type Props = {
  user: User | null
  products: Product[]
  applications: CreditItem[]
  onApply: (p: Product) => void
  onNeedProfile: () => void
}

const AMOUNT_OPTS = [
  { label: '400 тыс ₽', value: 400_000 },
  { label: '1 млн ₽', value: 1_000_000 },
  { label: '3 млн ₽', value: 3_000_000 },
  { label: '6 млн ₽', value: 6_000_000 },
]
const TERM_OPTS = [6, 12, 24, 36]

export function AssistantScreen({ user, products, applications, onApply, onNeedProfile }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [stage, setStage] = useState<Stage>('start')
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [pickedAmount, setPickedAmount] = useState(1_000_000)
  const idRef = useRef(1)
  const scrollRef = useRef<HTMLDivElement>(null)

  const push = (message: MsgIn) => {
    const id = idRef.current++
    setMsgs((prev) => [...prev, { ...message, id } as Msg])
  }

  useEffect(() => {
    push({ from: 'bot', text: `Здравствуйте! Подберу кредит по сумме, сроку, цели и показателям бизнеса. В каталоге ${products.length} продуктов. Никаких платных AI-сервисов: рекомендации объясняются прозрачными правилами.` })
    // Приветствие должно появиться один раз.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing])

  const startSelection = () => {
    if (!user) {
      push({ from: 'bot', text: 'Сначала заполните профиль бизнеса — открыл нужный раздел.' })
      onNeedProfile()
      return
    }
    push({ from: 'user', text: 'Подобрать кредит' })
    setStage('ask_amount')
    push({ from: 'bot', text: 'Какая сумма нужна бизнесу?' })
  }

  const recommend = async (amount: number, term: number, purpose: string) => {
    if (!user) return
    setTyping(true)
    try {
      const items = await getRecommendations(user, amount, term, purpose)
      if (items.length === 0) {
        push({ from: 'bot', text: 'По таким параметрам лимиты не подошли. Попробуйте изменить сумму или срок.' })
      } else {
        const best = items[0]
        push({ from: 'bot', text: `Лучшее совпадение — «${best.name}». ${best.reason}. Это оценка соответствия, а не гарантия одобрения.` })
        items.forEach((product) => push({ from: 'bot', product, why: product.reason ?? '' }))
      }
      setStage('done')
    } catch (error) {
      toast.error('Не удалось получить рекомендации', { description: error instanceof Error ? error.message : 'Проверьте API' })
    } finally {
      setTyping(false)
    }
  }

  const pickAmount = (label: string, value: number) => {
    push({ from: 'user', text: label })
    setPickedAmount(value)
    setStage('ask_term')
    push({ from: 'bot', text: 'На какой срок планируете вернуть?' })
  }

  const pickTerm = (term: number) => {
    push({ from: 'user', text: `${term} месяцев` })
    recommend(pickedAmount, term, user?.goal ?? 'Пополнение оборотных средств')
  }

  const statusAnswer = (alreadyShown = false) => {
    if (!alreadyShown) push({ from: 'user', text: 'Статус моей заявки' })
    const current = applications.find((a) => a.backendId)
    if (!current) {
      push({ from: 'bot', text: 'Сохранённых заявок пока нет. Могу подобрать кредит.' })
    } else {
      push({ from: 'bot', text: `Заявка №${current.backendId}: ${current.decisionComment ?? 'зарегистрирована и ожидает следующего этапа'}. Актуальный статус: ${current.statusRaw}.` })
    }
  }

  const freeText = () => {
    const text = draft.trim()
    if (!text) return
    if (!user && !/статус|заявк/i.test(text)) {
      onNeedProfile()
      return
    }
    push({ from: 'user', text })
    setDraft('')
    if (/статус|заявк/i.test(text)) {
      statusAnswer(true)
      return
    }
    const match = text.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(млн|миллион|тыс|тысяч)?/i)
    if (match) {
      let value = Number(match[1])
      if (match[2]?.startsWith('м')) value *= 1_000_000
      else if (match[2]?.startsWith('т')) value *= 1_000
      else if (value < 1000) value *= 1_000_000
      setPickedAmount(value)
      recommend(value, 12, text)
    } else {
      push({ from: 'bot', text: 'Напишите сумму и срок, например: «2 млн на 24 месяца на оборудование». Или используйте кнопки ниже.' })
    }
  }

  const quickReplies: { label: string; action: () => void }[] = stage === 'start'
    ? [{ label: 'Подобрать кредит', action: startSelection }, { label: 'Статус заявки', action: statusAnswer }]
    : stage === 'ask_amount'
      ? AMOUNT_OPTS.map((o) => ({ label: o.label, action: () => pickAmount(o.label, o.value) }))
      : stage === 'ask_term'
        ? TERM_OPTS.map((t) => ({ label: `${t} мес`, action: () => pickTerm(t) }))
        : [{ label: 'Подобрать ещё', action: () => { setStage('ask_amount'); push({ from: 'bot', text: 'На какую сумму?' }) } }]

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-card">
        <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Bot className="h-5 w-5" /></div>
        <div className="flex-1"><div className="text-sm font-semibold">Кредитный советник</div><div className="text-xs text-emerald-600">персональный подбор по правилам</div></div>
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.map((m) => 'product' in m
          ? <div key={m.id} className="w-[92%]"><ProductCard product={m.product} onApply={onApply} compact selectedAmount={pickedAmount} /></div>
          : <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.from === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>{m.text}{m.from === 'user' && <CheckCheck className="inline h-3.5 w-3.5 ml-1.5 opacity-70" />}</div></div>)}
        {typing && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Считаю соответствие продуктов…</div>}
      </div>
      <div className="px-3 pb-1.5 flex gap-1.5 overflow-x-auto">{quickReplies.map((q) => <Badge key={q.label} variant="outline" className="cursor-pointer whitespace-nowrap font-normal" onClick={q.action}>{q.label}</Badge>)}</div>
      <div className="flex items-center gap-1.5 border-t bg-card p-2.5">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && freeText()} placeholder="Например: 2 млн на оборудование" className="flex-1 min-w-0 rounded-full bg-muted px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
        <Button size="icon" className="rounded-full shrink-0" onClick={freeText} disabled={!draft.trim() || typing}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}
