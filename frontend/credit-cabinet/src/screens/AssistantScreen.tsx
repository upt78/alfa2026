import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Send, Mic, Paperclip, Bot, CheckCheck, Sparkles } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import { PRODUCTS, type CreditItem, type Product } from '@/lib/data'

type MsgIn = { from: 'bot' | 'user'; text: string } | { from: 'bot'; product: Product; why: string }
type Msg = MsgIn & { id: number }

type Stage = 'start' | 'ask_amount' | 'ask_term' | 'done'

type Props = {
  applications: CreditItem[]
  onApply: (p: Product) => void
}

const AMOUNT_OPTS = [
  { label: 'До 500 тыс ₽', value: 400_000 },
  { label: '1 млн ₽', value: 1_000_000 },
  { label: '3 млн ₽', value: 3_000_000 },
  { label: '5+ млн ₽', value: 6_000_000 },
]
const TERM_OPTS = [6, 12, 24, 36]

function recommend(amount: number, term: number): { product: Product; why: string } {
  let p: Product
  if (amount <= 500_000) p = PRODUCTS.find((x) => x.id === 'p6')!
  else if (amount <= 3_000_000 && term <= 36) p = PRODUCTS.find((x) => x.id === 'p1')!
  else if (amount <= 5_000_000) p = PRODUCTS.find((x) => x.id === 'p7')!
  else p = PRODUCTS.find((x) => x.id === 'p2')!
  const why = `Подобрал «${p.name}»: сумма ${amount >= 1_000_000 ? (amount / 1_000_000).toLocaleString('ru-RU') + ' млн ₽' : amount / 1000 + ' тыс ₽'} на ${term} мес подходит под лимиты продукта, вероятность одобрения ~${p.approval}%. Ставка от ${p.rateFrom}% — платёж укладывается в ваш оборот без нагрузки на оборотку.`
  return { product: p, why }
}

export function AssistantScreen({ applications, onApply }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [stage, setStage] = useState<Stage>('start')
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [pickedAmount, setPickedAmount] = useState(1_000_000)
  const idRef = useRef(1)
  const scrollRef = useRef<HTMLDivElement>(null)

  const push = (m: MsgIn) => {
    const id = idRef.current++
    setMsgs((prev) => [...prev, { ...m, id } as Msg])
    return id
  }

  const botSay = (text: string, delay = 900) => {
    setTyping(true)
    setTimeout(() => {
      push({ from: 'bot', text })
      setTyping(false)
    }, delay)
  }

  useEffect(() => {
    if (msgs.length === 0) {
      botSay(
        'Здравствуйте! Я — ИИ-советник вашего кредитного кабинета. Расскажите, какая задача у бизнеса, и я подберу подходящий продукт и проведу вас от заявки до решения.',
        600,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing])

  const startSelection = () => {
    push({ from: 'user', text: 'Подобрать кредит' })
    setStage('ask_amount')
    botSay('Отлично! На какую сумму нужны средства?')
  }

  const pickAmount = (label: string, value: number) => {
    push({ from: 'user', text: label })
    setPickedAmount(value)
    setStage('ask_term')
    botSay('Понял. На какой срок планируете вернуть?')
  }

  const pickTerm = (term: number) => {
    push({ from: 'user', text: `${term} месяцев` })
    const { product, why } = recommend(pickedAmount, term)
    setTyping(true)
    setTimeout(() => {
      push({ from: 'bot', text: why })
      setTimeout(() => {
        push({ from: 'bot', product, why } as Msg)
        setTyping(false)
      }, 700)
    }, 900)
    setStage('done')
  }

  const statusAnswer = () => {
    push({ from: 'user', text: 'Статус моей заявки' })
    const rev = applications.filter((a) => a.status === 'review')
    if (rev.length === 0) {
      botSay('Активных заявок сейчас нет. Могу подобрать кредит — это займёт пару минут.')
    } else {
      botSay(
        `У вас ${rev.length} заявка(и) на рассмотрении. Последняя — «${rev[0].productName}» на ${(rev[0].amount / 1_000_000).toLocaleString('ru-RU')} млн ₽: банк проверяет документы, это обычно занимает до 1 рабочего дня. Я уведомлю, как только придёт решение.`,
      )
    }
  }

  const explain = () => {
    push({ from: 'user', text: 'Объясните условия' })
    botSay(
      'Коротко о главном: ставка фиксируется после скоринга и не меняется по договору. Досрочное погашение — без комиссий. Просрочка влияет на кредитный рейтинг и может увеличить ставку по будущим кредитам. Могу рассказать подробнее о любом продукте — спросите, например: «что такое овердрафт?»',
    )
  }

  const freeText = () => {
    const text = draft.trim()
    if (!text) return
    push({ from: 'user', text })
    setDraft('')
    const numMatch = text.match(/(\d[\d\s]*)\s*(млн|миллион|тыс|тысяч)?/i)
    if (numMatch) {
      let v = parseInt(numMatch[1].replace(/\s/g, ''), 10)
      if (numMatch[2]?.startsWith('м')) v *= 1_000_000
      else if (numMatch[2]?.startsWith('т')) v *= 1_000
      const { product, why } = recommend(v, 12)
      setPickedAmount(v)
      setTyping(true)
      setTimeout(() => {
        push({ from: 'bot', text: `Записал: ${v.toLocaleString('ru-RU')} ₽. ${why}` })
        setTimeout(() => {
          push({ from: 'bot', product, why } as Msg)
          setTyping(false)
        }, 700)
      }, 900)
      setStage('done')
    } else if (/овердрафт/i.test(text)) {
      botSay('Овердрафт — это лимит, привязанный к расчётному счёту: если на счёте не хватает денег на платёж, банк покрывает разницу автоматически. Проценты платятся только на фактическую задолженность. Хорошо закрывает кассовые разрывы.')
    } else if (/статус|заявк/i.test(text)) {
      statusAnswer()
    } else {
      botSay('Понял вас. Чтобы точно подобрать продукт, уточните сумму и срок — или нажмите «Подобрать кредит» ниже.')
    }
  }

  const quickReplies: { label: string; action: () => void }[] =
    stage === 'start'
      ? [
          { label: 'Подобрать кредит', action: startSelection },
          { label: 'Статус заявки', action: statusAnswer },
          { label: 'Объясните условия', action: explain },
        ]
      : stage === 'ask_amount'
      ? AMOUNT_OPTS.map((o) => ({ label: o.label, action: () => pickAmount(o.label, o.value) }))
      : stage === 'ask_term'
      ? TERM_OPTS.map((t) => ({ label: `${t} мес`, action: () => pickTerm(t) }))
      : [{ label: 'Подобрать ещё', action: () => { setStage('ask_amount'); botSay('На какую сумму?') } }]

  return (
    <div className="h-full flex flex-col">
      {/* Шапка */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-card">
        <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold leading-tight">Кредитный советник</div>
          <div className="text-xs text-emerald-600 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> онлайн · отвечает мгновенно
          </div>
        </div>
        <Sparkles className="h-4 w-4 text-primary" />
      </div>

      {/* Переписка */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.map((m) =>
          'product' in m ? (
            <div key={m.id} className="flex justify-start">
              <div className="w-[85%]">
                <ProductCard product={m.product} onApply={onApply} compact selectedAmount={pickedAmount} />
              </div>
            </div>
          ) : (
            <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.from === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted rounded-bl-sm'
                }`}
              >
                {m.text}
                {m.from === 'user' && <CheckCheck className="inline h-3.5 w-3.5 ml-1.5 opacity-70" />}
              </div>
            </div>
          ),
        )}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Быстрые ответы */}
      <div className="px-3 pb-1.5 flex gap-1.5 overflow-x-auto">
        {quickReplies.map((q) => (
          <Badge
            key={q.label}
            variant="outline"
            className="cursor-pointer whitespace-nowrap font-normal hover:bg-primary hover:text-primary-foreground"
            onClick={q.action}
          >
            {q.label}
          </Badge>
        ))}
      </div>

      {/* Ввод */}
      <div className="flex items-center gap-1.5 border-t bg-card p-2.5">
        <Button variant="ghost" size="icon" className="shrink-0" title="Прикрепить документ">
          <Paperclip className="h-5 w-5" />
        </Button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && freeText()}
          placeholder="Напишите: «Нужно 2 млн на закупку товара»"
          className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <Button variant="ghost" size="icon" className="shrink-0" title="Голосовой ввод">
          <Mic className="h-5 w-5" />
        </Button>
        <Button size="icon" className="rounded-full shrink-0" onClick={freeText} disabled={!draft.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
