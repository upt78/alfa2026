import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  UserRound,
  Phone,
  ShieldCheck,
  Building2,
  Gauge,
  Landmark,
  LogOut,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Bell,
  KeyRound,
} from 'lucide-react'
import type { User } from '@/lib/data'

type Props = {
  user: User | null
  onLogin: (u: User) => void
  onLogout: () => void
}

const TURNOVERS = ['до 300 тыс ₽/мес', '300 тыс – 1 млн ₽/мес', '1 – 5 млн ₽/мес', 'свыше 5 млн ₽/мес']
const GOALS = ['Оборотные средства', 'Развитие бизнеса', 'Закупка товара к сезону']

export function ProfileScreen({ user, onLogin, onLogout }: Props) {
  const [step, setStep] = useState(0)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [inn, setInn] = useState('')
  const [autofilled, setAutofilled] = useState(false)
  const [turnover, setTurnover] = useState(TURNOVERS[1])
  const [goal, setGoal] = useState(GOALS[0])

  if (!user) {
    return (
      <div className="h-full overflow-y-auto p-5 space-y-5 bg-gradient-to-b from-teal-50/60 to-background">
        {step === 0 && (
          <>
            <div className="text-center pt-8 space-y-3">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
                <Landmark className="h-8 w-8" />
              </div>
              <h1 className="text-xl font-extrabold leading-tight">
                Умный кредитный<br />кабинет предпринимателя
              </h1>
              <p className="text-sm text-muted-foreground">
                ИИ-ассистент подберёт кредит под ваш бизнес и проведёт от заявки до решения
              </p>
            </div>
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Phone className="h-4 w-4 text-primary" /> Вход по номеру телефона
              </div>
              <Input
                placeholder="+7 (___) ___-__-__"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
              />
              <Button
                className="w-full"
                disabled={phone.replace(/\D/g, '').length < 10}
                onClick={() => setStep(1)}
              >
                Получить код <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Нажимая кнопку, вы соглашаетесь с условиями сервиса
              </p>
            </Card>
          </>
        )}

        {step === 1 && (
          <Card className="p-4 space-y-3 mt-16">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" /> Код из SMS
            </div>
            <p className="text-xs text-muted-foreground">Демо-режим: введите любые 4 цифры</p>
            <Input
              placeholder="••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              className="text-center text-2xl tracking-[0.6em]"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Назад
              </Button>
              <Button className="flex-1" disabled={code.length < 4} onClick={() => setStep(2)}>
                Подтвердить <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-4 space-y-4 mt-10">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-primary" /> Данные бизнеса
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">ИНН</label>
              <div className="flex gap-2">
                <Input
                  placeholder="10–12 цифр"
                  value={inn}
                  onChange={(e) => { setInn(e.target.value.replace(/\D/g, '').slice(0, 12)); setAutofilled(false) }}
                  inputMode="numeric"
                />
                <Button
                  variant="secondary"
                  disabled={inn.length < 10}
                  onClick={() => {
                    setAutofilled(true)
                    toast.success('Данные найдены в ФНС', { description: 'ИП Смирнов Алексей Викторович · ОКВЭД 47.11' })
                  }}
                >
                  Найти
                </Button>
              </div>
            </div>
            {autofilled && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm space-y-1">
                <div className="font-medium">ИП Смирнов Алексей Викторович</div>
                <div className="text-xs text-muted-foreground">ОКВЭД 47.11 — Торговля розничная в неспециализированных магазинах</div>
                <div className="text-xs text-muted-foreground">Бизнес зарегистрирован: 2019 г. · Признак массовости адреса: нет</div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Средний оборот в месяц</label>
              <div className="flex flex-wrap gap-1.5">
                {TURNOVERS.map((t) => (
                  <Badge key={t} variant={turnover === t ? 'default' : 'outline'} className="cursor-pointer font-normal"
                    onClick={() => setTurnover(t)}>
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Цель кредитования</label>
              <div className="flex flex-wrap gap-1.5">
                {GOALS.map((g) => (
                  <Badge key={g} variant={goal === g ? 'default' : 'outline'} className="cursor-pointer font-normal"
                    onClick={() => setGoal(g)}>
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!autofilled}
              onClick={() => {
                onLogin({ phone, inn, name: 'ИП Смирнов Алексей Викторович', okved: '47.11', turnover, goal })
                toast.success('Кабинет создан', { description: 'ИИ-ассистент уже подготовил персональные предложения' })
              }}
            >
              <Sparkles className="h-4 w-4 mr-1.5" /> Создать кабинет
            </Button>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <UserRound className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="font-semibold leading-tight">{user.name}</div>
          <div className="text-xs text-muted-foreground">ИНН {user.inn} · ОКВЭД {user.okved}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={onLogout} title="Выйти">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm font-medium mb-3">
          <Gauge className="h-4 w-4 text-primary" /> Кредитный рейтинг бизнеса
        </div>
        <div className="flex items-end gap-3">
          <div className="text-4xl font-extrabold text-primary leading-none">812</div>
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 mb-0.5">отлично</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Предодобренный лимит: <span className="font-semibold text-foreground">3 000 000 ₽</span> · Долговая нагрузка в норме
        </p>
        <Separator className="my-3" />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-muted p-2.5">
            <div className="text-muted-foreground">Оборот</div>
            <div className="font-medium">{user.turnover}</div>
          </div>
          <div className="rounded-lg bg-muted p-2.5">
            <div className="text-muted-foreground">Цель</div>
            <div className="font-medium">{user.goal}</div>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-1">
        {[
          { icon: Bell, label: 'Уведомления', value: 'вкл.' },
          { icon: KeyRound, label: 'Безопасность и вход', value: 'SMS + PIN' },
          { icon: Building2, label: 'Реквизиты бизнеса', value: 'заполнены' },
        ].map((r) => (
          <div key={r.label} className="flex items-center gap-3 py-2">
            <r.icon className="h-4 w-4 text-primary" />
            <span className="flex-1 text-sm">{r.label}</span>
            <span className="text-xs text-muted-foreground">{r.value}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
