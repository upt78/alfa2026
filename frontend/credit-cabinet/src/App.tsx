import { useCallback, useEffect, useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { UserRound, Bot, Store, History } from 'lucide-react'
import { toast } from 'sonner'
import { ProfileScreen } from '@/screens/ProfileScreen'
import { AssistantScreen } from '@/screens/AssistantScreen'
import { MarketScreen } from '@/screens/MarketScreen'
import { HistoryScreen } from '@/screens/HistoryScreen'
import { ApplyWizard } from '@/components/ApplyWizard'
import { INITIAL_CREDITS, type CreditItem, type Product, type User } from '@/lib/data'
import { clarifyApplication, createApplication, getApplications, getProducts, signApplication } from '@/lib/api'

type Tab = 'profile' | 'assistant' | 'market' | 'history'

const TABS: { id: Tab; label: string; icon: typeof UserRound }[] = [
  { id: 'profile', label: 'Профиль', icon: UserRound },
  { id: 'assistant', label: 'Советник', icon: Bot },
  { id: 'market', label: 'Кредиты', icon: Store },
  { id: 'history', label: 'Заявки', icon: History },
]

function loadUser(): User | null {
  try {
    const saved = localStorage.getItem('credit-user')
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('profile')
  const [user, setUser] = useState<User | null>(loadUser)
  const [credits, setCredits] = useState<CreditItem[]>(INITIAL_CREDITS)
  const [products, setProducts] = useState<Product[]>([])
  const [applying, setApplying] = useState<Product | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    getProducts().then(setProducts).catch((error: Error) => setLoadError(error.message))
  }, [])

  const refreshApplications = useCallback(async () => {
    if (!user) return
    try {
      const applications = await getApplications(user.inn)
      setCredits([...applications, ...INITIAL_CREDITS])
      setLoadError('')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'API недоступен')
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const initial = window.setTimeout(refreshApplications, 0)
    const timer = window.setInterval(refreshApplications, 2000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(timer)
    }
  }, [refreshApplications, user])

  const login = (value: User) => {
    localStorage.setItem('credit-user', JSON.stringify(value))
    setUser(value)
  }

  const logout = () => {
    localStorage.removeItem('credit-user')
    setUser(null)
    setCredits(INITIAL_CREDITS)
  }

  const openApply = (product: Product) => {
    if (!user) {
      setTab('profile')
      toast.info('Сначала заполните профиль бизнеса')
      return
    }
    setApplying(product)
  }

  const finishApply = async (amount: number, term: number, purpose: string) => {
    if (!applying || !user) return
    await createApplication(user, applying, amount, term, purpose)
    await refreshApplications()
    setApplying(null)
    setTab('history')
  }

  const sign = async (item: CreditItem) => {
    if (!item.backendId) return
    await signApplication(item.backendId)
    await refreshApplications()
    toast.success('Договор подписан', { description: 'Выдача средств смоделирована, заявка завершена.' })
  }

  const clarify = async (item: CreditItem, comment: string) => {
    if (!item.backendId) return
    await clarifyApplication(item.backendId, comment)
    await refreshApplications()
    toast.success('Уточнение отправлено', { description: 'Заявка вернулась на автоматическую обработку.' })
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 sm:p-8">
      <div className="hidden lg:block max-w-xs mr-12 text-slate-300">
        <h1 className="text-3xl font-extrabold text-white leading-tight">Умный кредитный кабинет предпринимателя</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          Персональный подбор кредита и сквозной путь заявки: от потребности бизнеса до решения и подписания.
        </p>
        <ul className="mt-6 space-y-2.5 text-sm">
          {['Профиль и данные бизнеса', 'Прозрачный подбор продукта', 'Проверки, скоринг и решение', 'Статусы сохраняются в базе'].map((s) => (
            <li key={s} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-teal-400" />{s}</li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-slate-500">Все данные синтетические · внешние проверки смоделированы</p>
      </div>

      <div className="relative w-full max-w-[400px] h-[min(830px,92vh)] rounded-[2.6rem] border-[10px] border-slate-800 bg-background shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 pt-2.5 pb-1 text-[11px] font-semibold bg-card shrink-0">
          <span>Кредитный кабинет</span><span className="text-emerald-600">● online</span>
        </div>
        {loadError && <div className="bg-red-50 text-red-700 text-xs px-4 py-2">Нет связи с API: {loadError}</div>}
        <div className="flex-1 min-h-0">
          {tab === 'profile' && <ProfileScreen user={user} onLogin={login} onLogout={logout} />}
          {tab === 'assistant' && <AssistantScreen user={user} products={products} applications={credits} onApply={openApply} onNeedProfile={() => setTab('profile')} />}
          {tab === 'market' && <MarketScreen products={products} onApply={openApply} onGoAssistant={() => setTab('assistant')} />}
          {tab === 'history' && <HistoryScreen items={credits} onSign={sign} onClarify={clarify} />}
        </div>
        <nav className="grid grid-cols-4 border-t bg-card shrink-0 pb-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${tab === t.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <t.icon className="h-5 w-5" />{t.label}
            </button>
          ))}
        </nav>
      </div>

      <ApplyWizard product={applying} user={user} onClose={() => setApplying(null)} onFinish={finishApply} />
      <Toaster position="top-center" richColors />
    </div>
  )
}
